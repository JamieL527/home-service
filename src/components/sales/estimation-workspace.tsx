'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  X, Plus, Trash2, FileText, MessageSquare, Ruler,
  Sparkles, Calendar, Clock,
  CheckCircle, AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addDealPlan, deleteDealPlan, addMeasurement, deleteMeasurement, addComment } from '@/app/actions/estimation'
import { createQuote, updateQuote, acceptQuote, deleteQuote, updateDeal } from '@/app/actions/sales'

const PLAN_TYPES = ['Floor Plan', 'Elevation', 'Foundation', 'Framing', 'Electrical', 'Plumbing', 'HVAC']
const CONTRACTOR_UPLOAD_TYPES = ['Site Photo', 'Field Measurement', 'Reference Image', 'Other']
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const UNITS = ['sqft', 'sq m', 'ft', 'm', 'lf', 'ea', 'pcs', 'hrs']
const LINE_ITEM_UNITS = ['ea', 'sq ft', 'lin ft', 'cu yd', 'hr', 'day', 'lump sum']

type Plan = { id: string; name: string; planType: string; fileUrl: string; fileType: string; uploadedByRole: string | null }
type Measurement = { id: string; label: string; type: string; value: number; unit: string; notes: string | null }
type Comment = {
  id: string; content: string; createdAt: Date
  author: { id: string; firstName: string | null; lastName: string | null; email: string; role: string }
}
type LineItem = { description: string; quantity: number; unit: string; unitPrice: number }
type Quote = {
  id: string; version: number; lineItems: unknown; subtotal: number | null; tax: number | null
  total: number | null; status: string; notes: string | null; pdfUrl: string | null
  createdAt: Date; submittedAt: Date | null
}
type Deal = {
  id: string
  projectName: string | null
  clientName: string | null
  projectType: string | null
  currentStage: string
  siteVisitDate: Date | null
  lead: { address: string; phase: string | null; source: string | null }
  plans: Plan[]
  measurements: Measurement[]
  comments: Comment[]
  quotes: Quote[]
}

export type JobInfo = {
  scope: string | null
  serviceType: string | null
  contractorType: string | null
  timeline: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseEndDate(timeline: string | null): Date | null {
  if (!timeline) return null
  const m =
    timeline.match(/[Ee]nd[:\s]+(\d{4}-\d{2}-\d{2})/) ||
    timeline.match(/[Ee]nd[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/)
  if (!m) return null
  const d = new Date(m[1])
  return isNaN(d.getTime()) ? null : d
}

function dealQuoteNo(dealId: string, version: number): string {
  let h = 0
  for (let i = 0; i < dealId.length; i++) {
    h = Math.imul(31, h) + dealId.charCodeAt(i) | 0
  }
  const base = (Math.abs(h) % 900000) + 100000
  return `Q-${base}-V${version}`
}

function parseStartDate(timeline: string | null): Date | null {
  if (!timeline) return null
  const m =
    timeline.match(/[Ss]tart[:\s]+(\d{4}-\d{2}-\d{2})/) ||
    timeline.match(/[Ss]tart[:\s]+([A-Za-z]+ \d{1,2},?\s*\d{4})/)
  if (!m) return null
  const d = new Date(m[1])
  return isNaN(d.getTime()) ? null : d
}

function daysFromNow(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtMoney(n: number | null): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function lineItemsOf(q: Quote): LineItem[] {
  try { return (q.lineItems as LineItem[]) ?? [] } catch { return [] }
}

function deriveQuoteStatus(quotes: Quote[]) {
  if (quotes.length === 0) return { label: 'Not started', sub: 'Start building' }
  const latest = quotes[0]
  if (latest.status === 'accepted') return { label: 'Accepted', sub: 'Quote accepted' }
  if (latest.status === 'submitted' || latest.status === 'pending_review')
    return { label: 'Submitted', sub: 'Awaiting review' }
  return { label: 'In progress', sub: 'Draft saved' }
}

const TEAM_ROLES = ['ADMIN', 'SALES', 'MARKETING', 'DATA_COLLECTOR']

function authorInitials(a: Comment['author']): string {
  if (TEAM_ROLES.includes(a.role)) return 'CM'
  if (a.firstName) return (a.firstName[0] + (a.lastName?.[0] ?? '')).toUpperCase()
  return a.email.slice(0, 2).toUpperCase()
}

function authorDisplayName(a: Comment['author']): string {
  if (TEAM_ROLES.includes(a.role)) return 'Construction Market Team'
  if (a.firstName || a.lastName) return `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim()
  return a.email
}

// ── Site Visit Editor (sales only) ────────────────────────────────────────────

function SiteVisitEditor({ dealId, initialDate }: { dealId: string; initialDate: Date | null }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const toLocal = (d: Date) => {
    const offset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - offset).toISOString().slice(0, 16)
  }
  const [value, setValue] = useState(initialDate ? toLocal(new Date(initialDate)) : '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setValue(v)
    startTransition(async () => {
      await updateDeal(dealId, { siteVisitDate: v ? new Date(v) : null })
      router.refresh()
    })
  }

  return (
    <input
      type="datetime-local"
      value={value}
      onChange={handleChange}
      disabled={pending}
      className="text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 disabled:opacity-50"
    />
  )
}

// ── Status Cards ──────────────────────────────────────────────────────────────

function StatusCards({ deal, job }: { deal: Deal; job?: JobInfo | null }) {
  const endDate = parseEndDate(job?.timeline ?? null)
  const days = endDate ? daysFromNow(endDate) : null
  const qs = deriveQuoteStatus(deal.quotes)

  const cards = [
    {
      icon: '⏱',
      label: 'Deadline',
      value: endDate ? fmtDate(endDate) : 'Not set',
      sub: days != null ? (days < 0 ? `${Math.abs(days)} days overdue` : `${days} days remaining`) : 'No end date',
      red: days != null && days < 0,
    },
    {
      icon: '📅',
      label: 'Site visit',
      value: deal.siteVisitDate
        ? new Date(deal.siteVisitDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not scheduled',
      sub: deal.siteVisitDate ? 'Scheduled' : 'Request below',
      red: false,
    },
    { icon: '📄', label: 'Quote status', value: qs.label, sub: qs.sub, red: false },
    {
      icon: '📐',
      label: 'Measurements',
      value: `${deal.measurements.length} captured`,
      sub: deal.measurements.length > 0 ? 'Ready for quote' : 'None yet',
      red: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 14, margin: '22px 0 8px' }}>
      {cards.map((c, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #e7e8ef', borderRadius: 13, padding: '15px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
            {c.icon} {c.label}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: c.red ? '#ef4444' : '#0f172a' }}>
            {c.value}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  )
}

// ── Job Overview ──────────────────────────────────────────────────────────────

function JobOverviewSection({ deal, job, isSales }: { deal: Deal; job?: JobInfo | null; isSales: boolean }) {
  const startDate = parseStartDate(job?.timeline ?? null)
  const endDate = parseEndDate(job?.timeline ?? null)

  const lbl: React.CSSProperties = { fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 7 }
  const bodytext: React.CSSProperties = { fontSize: 14, color: '#334155' }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '30px 0 4px', color: '#0f172a' }}>Job overview</h2>
      <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px' }}>Project scope and timeline details</p>
      <div style={{ background: '#fff', border: '1px solid #e7e8ef', borderRadius: 16, boxShadow: '0 1px 2px rgba(15,23,42,.04),0 10px 30px rgba(15,23,42,.06)' }}>
        <div style={{ padding: '22px 24px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr]" style={{ gap: 26 }}>
            <div>
              <div style={lbl}>Scope of work</div>
              <div style={bodytext}>
                {job?.scope || <em style={{ color: '#94a3b8' }}>Not specified</em>}
              </div>
              <div style={{ ...lbl, marginTop: 18 }}>Project timeline</div>
              <div style={bodytext}>
                {startDate || endDate ? (
                  <>
                    {startDate && <div>Start: {fmtDate(startDate)}</div>}
                    {endDate && <div>End: {fmtDate(endDate)}</div>}
                  </>
                ) : (
                  <em style={{ color: '#94a3b8' }}>{job?.timeline || 'Not specified'}</em>
                )}
              </div>
            </div>
            <div>
              <div style={lbl}>Trade</div>
              <div style={bodytext}>
                {job?.serviceType ?? job?.contractorType ?? <em style={{ color: '#94a3b8' }}>Not specified</em>}
              </div>
              <div style={{ ...lbl, marginTop: 18 }}>Site visit</div>
              <div style={bodytext}>
                {isSales ? (
                  <SiteVisitEditor dealId={deal.id} initialDate={deal.siteVisitDate} />
                ) : deal.siteVisitDate ? (
                  new Date(deal.siteVisitDate).toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
                ) : (
                  'Not scheduled yet'
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Construction Plans ────────────────────────────────────────────────────────

function ConstructionPlansSection({ deal, isSales, isContractor }: { deal: Deal; isSales: boolean; isContractor: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Unsupported file type. PDF, PNG, JPG, WEBP only.')
      return
    }
    setUploadError('')
    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `deal-plans/${deal.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('deal-plans').upload(path, file, { upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('deal-plans').getPublicUrl(path)
      const name = file.name.replace(/\.[^.]+$/, '')
      startTransition(async () => {
        await addDealPlan(deal.id, { name, planType: 'Floor Plan', fileUrl: data.publicUrl, fileType: file.type })
        router.refresh()
      })
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function remove(planId: string) {
    if (!confirm('Remove this file?')) return
    startTransition(async () => {
      await deleteDealPlan(planId, deal.id)
      router.refresh()
    })
  }

  const canDelete = (plan: Plan) =>
    isSales || (isContractor && plan.uploadedByRole === 'CONTRACTOR')

  return (
    <div>
      {/* q-h header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Plans &amp; photos</h3>
        <div>
          <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFile} className="hidden" />
          <button
            disabled={uploading || pending}
            onClick={() => fileRef.current?.click()}
            style={{ background: '#fff', color: '#0f172a', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 13, padding: '8px 13px', cursor: (uploading || pending) ? 'not-allowed' : 'pointer', opacity: (uploading || pending) ? 0.55 : 1 }}
          >
            ⬆ {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {uploadError && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{uploadError}</p>}

      {/* Plan list */}
      <div>
        {deal.plans.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: '#cbd5e1', fontSize: 14, borderTop: '1px solid #e7e8ef' }}>
            No files uploaded yet
          </div>
        ) : (
          deal.plans.map(plan => {
            const tag = plan.uploadedByRole === 'CONTRACTOR' ? 'You' : 'Shared'
            return (
              <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #e7e8ef', fontSize: 14 }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0, flex: 1, minWidth: 0 }}>
                  <span style={{ marginRight: 6 }}>📎</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {plan.name || plan.planType}
                  </span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 999, marginLeft: 6, flexShrink: 0 }}>
                    {tag}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <a
                    href={plan.fileUrl}
                    download={plan.name || plan.planType}
                    target="_blank"
                    rel="noreferrer"
                    style={{ background: '#fff', color: '#0f172a', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 13, padding: '7px 12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    ⬇ Download
                  </a>
                  {canDelete(plan) && (
                    <button
                      disabled={pending}
                      onClick={() => remove(plan.id)}
                      style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0, opacity: pending ? 0.4 : 1 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ fontSize: '12.5px', color: '#64748b', background: '#f8fafc', border: '1px solid #e7e8ef', borderRadius: 9, padding: '10px 12px', marginTop: 12 }}>
        On the Referral plan you quote from the plans and photos shared here. Upload your own site photos or markups, and download anything to work offline. Need to see it in person? Use Comments to request a site visit.
      </div>
    </div>
  )
}

// ── Takeoff & Measurement ─────────────────────────────────────────────────────

function TakeoffSection({ deal, readOnly }: { deal: Deal; readOnly: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newUnit, setNewUnit] = useState('sqft')

  function addRow() {
    if (!newLabel.trim() || !newValue) return
    startTransition(async () => {
      await addMeasurement(deal.id, {
        label: newLabel.trim(),
        type: 'area',
        value: parseFloat(newValue),
        unit: newUnit,
      })
      router.refresh()
      setNewLabel(''); setNewValue(''); setNewUnit('sqft'); setAdding(false)
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMeasurement(id, deal.id)
      router.refresh()
    })
  }

  return (
    <div>
      {/* lbl */}
      <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 12 }}>
        Measurements captured on site
      </div>

      {deal.measurements.length === 0 && !adding ? (
        <div className="flex flex-col items-center justify-center py-8" style={{ color: '#cbd5e1' }}>
          <Ruler size={28} className="mb-2" />
          <p className="text-sm">No measurements yet</p>
        </div>
      ) : (
        <div>
          {deal.measurements.map(m => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', border: '1px solid #e7e8ef', borderRadius: 10, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{m.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, color: '#334155' }}>{m.value} {m.unit}</span>
                {!readOnly && (
                  <button disabled={pending} onClick={() => remove(m.id)} style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: pending ? 0.4 : 1 }}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {adding && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
              <input
                autoFocus placeholder="Measurement name" value={newLabel}
                onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRow()}
                style={{ flex: 1, fontSize: 14, background: '#fff', border: '1px solid #e7e8ef', borderRadius: 7, padding: '6px 10px', outline: 'none', minWidth: 0 }}
              />
              <input
                type="number" min={0} placeholder="0" value={newValue}
                onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRow()}
                style={{ width: 80, fontSize: 14, background: '#fff', border: '1px solid #e7e8ef', borderRadius: 7, padding: '6px 10px', outline: 'none', textAlign: 'right' }}
              />
              <select value={newUnit} onChange={e => setNewUnit(e.target.value)} style={{ fontSize: 13, background: '#fff', border: '1px solid #e7e8ef', borderRadius: 7, padding: '6px 8px', outline: 'none' }}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
              <button disabled={pending || !newLabel.trim() || !newValue} onClick={addRow} style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: (pending || !newLabel.trim() || !newValue) ? 0.4 : 1 }}>
                <CheckCircle size={16} />
              </button>
              <button onClick={() => { setAdding(false); setNewLabel(''); setNewValue('') }} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {!readOnly && !adding && (
        <button onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 12 }}>
          <Plus size={14} /> Add Measurement
        </button>
      )}

      <div style={{ fontSize: '12.5px', color: '#64748b', background: '#f8fafc', border: '1px solid #e7e8ef', borderRadius: 9, padding: '10px 12px', marginTop: 12 }}>
        Automatic takeoff from plans is part of Direct Outreach. On Referral, use these measurements (or your own from a site visit) to price your line items.
      </div>
    </div>
  )
}

// ── Comments ──────────────────────────────────────────────────────────────────

function QuestionsSection({ deal, currentUserId }: { deal: Deal; currentUserId: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [text, setText] = useState('')

  function submit() {
    if (!text.trim() || !currentUserId) return
    startTransition(async () => {
      await addComment(deal.id, text.trim(), currentUserId)
      router.refresh()
      setText('')
    })
  }

  return (
    <div>
      {/* thread messages */}
      {deal.comments.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', color: '#cbd5e1' }}>
          <MessageSquare size={28} style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 14, margin: 0 }}>No messages yet</p>
        </div>
      ) : (
        <div style={{ marginBottom: 4 }}>
          {deal.comments.map(c => {
            const isMe = c.author.id === currentUserId
            return (
              <div key={c.id} style={{ marginBottom: 12, textAlign: isMe ? 'right' : 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 3 }}>
                  {isMe ? 'You' : authorDisplayName(c.author)}
                </div>
                <span style={{ display: 'inline-block', background: isMe ? '#dbeafe' : '#f1f5f9', padding: '9px 13px', borderRadius: 12, fontSize: '13.5px', color: '#0f172a' }}>
                  {c.content}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {currentUserId && (
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <input
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Ask the team about plans or scope…"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            style={{ flex: 1, border: '1px solid #e7e8ef', borderRadius: 10, padding: '11px 12px', fontFamily: 'inherit', fontSize: '13.5px', outline: 'none' }}
          />
          <button
            disabled={!text.trim() || pending} onClick={submit}
            style={{ background: '#fff', color: '#0f172a', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 14, padding: '11px 18px', cursor: (!text.trim() || pending) ? 'not-allowed' : 'pointer', opacity: (!text.trim() || pending) ? 0.45 : 1, whiteSpace: 'nowrap' }}
          >
            Send
          </button>
        </div>
      )}

      <div style={{ fontSize: '12.5px', color: '#64748b', background: '#f8fafc', border: '1px solid #e7e8ef', borderRadius: 9, padding: '10px 12px', marginTop: 12 }}>
        Messages here go to the Construction Market team — they coordinate everything with the builder for you.
      </div>
    </div>
  )
}

// ── Quote Preview (inline document) ──────────────────────────────────────────

function QuotePreviewInline({
  items, notes, subtotal, tax, total, taxRate, deal, job, companyName, companyLogoUrl, isContractor, quoteVersion, companyCredentials,
}: {
  items: LineItem[]
  notes: string
  subtotal: number
  tax: number
  total: number
  taxRate: number
  deal: Deal
  job?: JobInfo | null
  companyName?: string | null
  companyLogoUrl?: string | null
  isContractor?: boolean
  quoteVersion?: number
  companyCredentials?: string | null
}) {
  const visibleItems = items.filter(i => i.description.trim())
  const initials = companyName
    ? companyName.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
    : 'CM'
  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 30)
  const validUntilStr = validUntil.toLocaleDateString('en-CA')

  return (
    <div className="border border-gray-200 rounded-2xl p-8 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start gap-6">
        <div className="flex items-center gap-3.5">
          {companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companyLogoUrl}
              alt={companyName ?? 'Company logo'}
              className="w-14 h-14 rounded-xl object-contain flex-shrink-0 border border-gray-100"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-xl text-white select-none"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              {initials}
            </div>
          )}
          <div>
            <div className="text-lg font-black text-gray-900 leading-tight">{companyName || 'Your Company'}</div>
            <div className="text-xs text-gray-400 mt-0.5">{companyCredentials || 'Issued through Construction Market'}</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className="text-4xl font-black leading-none"
            style={{ background: 'linear-gradient(120deg, #2563eb, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            QUOTE
          </div>
        </div>
      </div>

      {/* Gradient rule */}
      <div
        className="h-[3px] rounded-full my-6"
        style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed 60%, transparent)' }}
      />

      {/* Meta — Quote number / Issue date / Valid until */}
      <div className="grid grid-cols-3 gap-6 mb-5">
        <div>
          <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1.5">Quote number</div>
          <div className="text-sm font-bold text-gray-900">{quoteVersion != null ? dealQuoteNo(deal.id, quoteVersion) : '—'}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1.5">Issue date</div>
          <div className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString('en-CA')}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1.5">Valid until</div>
          <div className="text-sm font-bold text-gray-900">{validUntilStr}</div>
        </div>
      </div>

      {/* Client & project block */}
      <div className="mb-7">
        <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">Client &amp; project</div>
        <p className="text-sm text-gray-800 mb-1">
          <strong>Prepared for:</strong>{' '}
          {isContractor ? 'Project owner — via Construction Market' : (deal.clientName || 'Valued Client')}
        </p>
        <p className="text-sm text-gray-800 mb-1">
          <strong>Project address:</strong> {deal.lead.address}
        </p>
        <p className="text-sm text-gray-800 mb-0">
          <strong>Trade:</strong> {job?.serviceType || job?.contractorType || '—'}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 480 }}>
          <thead>
            <tr>
              <th className="text-left text-[10px] font-bold tracking-widest text-gray-400 uppercase pb-2.5 px-3 border-b border-gray-200">Description</th>
              <th className="text-right text-[10px] font-bold tracking-widest text-gray-400 uppercase pb-2.5 px-3 border-b border-gray-200 w-16">Qty</th>
              <th className="text-right text-[10px] font-bold tracking-widest text-gray-400 uppercase pb-2.5 px-3 border-b border-gray-200 w-20">Unit</th>
              <th className="text-right text-[10px] font-bold tracking-widest text-gray-400 uppercase pb-2.5 px-3 border-b border-gray-200 w-28">Unit price</th>
              <th className="text-right text-[10px] font-bold tracking-widest text-gray-400 uppercase pb-2.5 px-3 border-b border-gray-200 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-sm text-gray-300 px-3">No line items yet</td></tr>
            ) : (
              visibleItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-3.5 border-b border-gray-100 text-sm font-semibold px-3">{item.description}</td>
                  <td className="py-3.5 border-b border-gray-100 text-sm text-right px-3">{item.quantity}</td>
                  <td className="py-3.5 border-b border-gray-100 text-sm text-right text-gray-400 px-3">{item.unit || 'ea'}</td>
                  <td className="py-3.5 border-b border-gray-100 text-sm text-right px-3">{fmtMoney(item.unitPrice)}</td>
                  <td className="py-3.5 border-b border-gray-100 text-sm text-right font-bold px-3">{fmtMoney(item.quantity * item.unitPrice)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mt-4">
        <div className="w-72">
          <div className="flex justify-between py-1.5 px-3 text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>{fmtMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between py-1.5 px-3 text-sm">
            <span className="text-gray-500">HST ({taxRate}%)</span>
            <span>{fmtMoney(tax)}</span>
          </div>
          <div className="flex justify-between items-baseline mt-1.5 pt-3 px-3 border-t-2 border-gray-200">
            <span className="font-black text-sm">Total</span>
            <span
              className="text-2xl font-black"
              style={{ background: 'linear-gradient(120deg, #4f46e5, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
            >
              {fmtMoney(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1.5">Notes</div>
          <p className="text-sm text-gray-700">{notes}</p>
        </div>
      )}

      {/* Terms */}
      <div className="mt-6 text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-4">
        This quote is valid for 30 days from the issue date. Payment terms: Net 30 days upon completion. All work performed in accordance with industry standards and applicable building codes.
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400">
        <span>Thank you for the opportunity to quote your project.</span>
        <span className="font-semibold">constructionmarket.ca</span>
      </div>
    </div>
  )
}

// ── Build Quote ───────────────────────────────────────────────────────────────

function BuildQuoteSection({
  deal, isContractor, job, companyName, companyLogoUrl, companyCredentials,
}: {
  deal: Deal
  isContractor: boolean
  job?: JobInfo | null
  companyName?: string | null
  companyLogoUrl?: string | null
  companyCredentials?: string | null
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const draftQuote = deal.quotes.find(q => q.status === 'draft')

  // Contractor mode: 'build' | 'preview' | 'issued'
  // Sales mode: always 'build' (form + quote list)
  const [mode, setMode] = useState<'build' | 'preview' | 'issued'>(() => {
    if (!isContractor) return 'build'
    if (draftQuote) return 'build'
    if (deal.quotes.length > 0) return 'issued'
    return 'build'
  })

  // Form state — initialized from draft if one exists
  const [items, setItems] = useState<LineItem[]>(() => {
    if (draftQuote) {
      const li = lineItemsOf(draftQuote)
      if (li.length > 0) return li.map(i => ({ ...i, unit: (i as LineItem & { unit?: string }).unit ?? 'ea' }))
    }
    return [{ description: '', quantity: 1, unit: 'ea', unitPrice: 0 }]
  })
  const [notes, setNotes] = useState(() => draftQuote?.notes ?? '')
  const [taxRate, setTaxRate] = useState(() => {
    if (draftQuote?.subtotal && draftQuote?.tax && draftQuote.subtotal > 0) {
      return Math.round((draftQuote.tax / draftQuote.subtotal) * 100)
    }
    return 13
  })

  // For sales: separate editingId to track which quote is being edited
  const [editingId, setEditingId] = useState<string | null>(null)

  const validItems = items.filter(i => i.description.trim())
  const subtotal = validItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const tax = Math.round(subtotal * taxRate) / 100
  const total = subtotal + tax

  function openEdit(q: Quote) {
    const li = lineItemsOf(q)
    setItems(li.length > 0 ? li.map(i => ({ ...i, unit: (i as LineItem & { unit?: string }).unit ?? 'ea' })) : [{ description: '', quantity: 1, unit: 'ea', unitPrice: 0 }])
    setNotes(q.notes ?? '')
    setEditingId(q.id)
    if (isContractor) setMode('build')
  }

  function resetForm() {
    setItems([{ description: '', quantity: 1, unit: 'ea', unitPrice: 0 }])
    setNotes('')
    setEditingId(null)
  }

  function save(doSubmit: boolean) {
    if (validItems.length === 0) { alert('Add at least one line item.'); return }
    // Determine which quote to update: for contractor use draftQuote.id, for sales use editingId state
    const currentEditingId = isContractor
      ? (deal.quotes.find(q => q.status === 'draft')?.id ?? null)
      : editingId
    startTransition(async () => {
      const payload = { lineItems: validItems, subtotal, tax, total, notes: notes || undefined, submit: doSubmit }
      if (currentEditingId) { await updateQuote(currentEditingId, deal.id, payload) }
      else { await createQuote(deal.id, payload) }
      router.refresh()
      if (doSubmit) {
        if (isContractor) { setMode('issued') }
        else { resetForm() }
      }
    })
  }

  // ── Contractor: Issued state ───────────────────────────────────────────────
  if (isContractor && mode === 'issued') {
    return (
      <div>
        <div style={{ fontSize: '12.5px', color: '#64748b', background: '#f8fafc', border: '1px solid #e7e8ef', borderRadius: 9, padding: '10px 12px', marginBottom: 16 }}>
          ✓ Your quote is issued and sent. It&apos;s locked and now sits under <strong style={{ color: '#0f172a' }}>Jobs → Completed</strong>. Need to change something? Start a new version.
        </div>
        <button
          onClick={() => { resetForm(); setMode('build') }}
          style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 11, fontWeight: 700, fontSize: 14, padding: '13px 18px', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <Plus size={14} /> New version
        </button>
      </div>
    )
  }

  // ── Contractor: Preview state ──────────────────────────────────────────────
  if (isContractor && mode === 'preview') {
    const submittedCount = deal.quotes.filter(q => q.status !== 'draft').length
    const previewVersion = draftQuote?.version ?? (submittedCount + 1)
    return (
      <div className="space-y-4">
        <QuotePreviewInline
          items={items} notes={notes} subtotal={subtotal} tax={tax} total={total}
          taxRate={taxRate} deal={deal} job={job} companyName={companyName}
          companyLogoUrl={companyLogoUrl} isContractor={isContractor}
          quoteVersion={previewVersion} companyCredentials={companyCredentials}
        />
        <p style={{ fontSize: '12.5px', color: '#64748b', background: '#f8fafc', border: '1px solid #e7e8ef', borderRadius: 9, padding: '10px 12px', marginTop: 14 }}>
          Once you submit, this quote is issued and sent — it can&apos;t be edited. To change anything afterward you&apos;ll create a new version.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setMode('build')}
            style={{ background: '#fff', color: '#0f172a', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 14, padding: '13px 18px', cursor: 'pointer' }}
          >
            ← Back to edit
          </button>
          <button
            disabled={pending || validItems.length === 0}
            onClick={() => save(true)}
            style={{ background: '#16a34a', color: '#fff', border: 0, borderRadius: 11, fontWeight: 700, fontSize: 14, padding: '13px 18px', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: (pending || validItems.length === 0) ? 'not-allowed' : 'pointer', opacity: (pending || validItems.length === 0) ? 0.55 : 1 }}
          >
            {pending ? 'Submitting…' : '➤ Submit quote'}
          </button>
        </div>
      </div>
    )
  }

  // ── Build form (contractor build mode OR sales) ────────────────────────────
  return (
    <div className="space-y-4">
      {/* AI Quick Fill (placeholder) */}
      {isContractor && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-base font-black text-gray-900">⚡ AI Quick Fill</h3>
            <span className="text-[10px] font-bold tracking-wider text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full uppercase">Assist</span>
          </div>
          <div style={{ background: '#f8fffd', border: '1px solid #bdf0e6', borderRadius: 13, padding: '16px 18px', marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: '#0f766e' }}>
              Paste or tweak the scope, and the assistant drafts your line items and rough quantities. <strong>You set your own prices.</strong>
            </p>
            <textarea
              rows={3}
              defaultValue={job?.scope ?? ''}
              placeholder="Describe the scope of work…"
              className="w-full border border-teal-200 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400 resize-none"
            />
            <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 10 }}>
              <button
                disabled
                title="Coming soon"
                style={{ background: '#0d9488', color: '#fff', border: 0, borderRadius: 11, fontWeight: 700, fontSize: 14, padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: 0.55, cursor: 'not-allowed' }}
              >
                <Sparkles size={14} /> Draft line items
              </button>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>Adds to the list below — nothing is sent yet.</span>
            </div>
          </div>
        </div>
      )}

      {/* Sales: editing indicator */}
      {!isContractor && editingId && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
          <span className="text-xs font-semibold text-amber-700">Editing quote</span>
          <button onClick={resetForm} className="text-xs text-gray-400 hover:text-gray-600">Cancel Edit</button>
        </div>
      )}

      {/* Line Items */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-black text-gray-900">Line items</span>
          <button
            onClick={() => setItems(p => [...p, { description: '', quantity: 1, unit: 'ea', unitPrice: 0 }])}
            className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus size={13} /> Add item
          </button>
        </div>

        <div className="overflow-x-auto">
          {/* Header row */}
          <div className="hidden sm:grid px-4 py-2 border-b border-gray-100 text-[10px] font-bold tracking-widest text-gray-400 uppercase"
               style={{ gridTemplateColumns: '30px 1fr 80px 86px 110px 96px 32px', gap: '8px' }}>
            <span></span>
            <span>Description</span>
            <span>Unit</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Total</span>
            <span></span>
          </div>

          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-300">No items yet — add one below.</div>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                className="px-4 py-2.5 border-b border-gray-100 grid items-center"
                style={{ gridTemplateColumns: '30px 1fr 80px 86px 110px 96px 32px', gap: '8px' }}
              >
                <span className="text-xs font-bold text-gray-400 text-center">{idx + 1}</span>
                <input
                  placeholder="Item description"
                  value={item.description}
                  onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))}
                  className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 min-w-0 w-full"
                />
                <div className="flex flex-col gap-1">
                  <select
                    value={LINE_ITEM_UNITS.includes(item.unit) ? item.unit : '__custom__'}
                    onChange={e => {
                      const val = e.target.value
                      setItems(p => p.map((it, i) => i === idx ? { ...it, unit: val === '__custom__' ? '' : val } : it))
                    }}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 w-full"
                  >
                    {LINE_ITEM_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    <option value="__custom__">Custom…</option>
                  </select>
                  {!LINE_ITEM_UNITS.includes(item.unit) && (
                    <input
                      value={item.unit}
                      placeholder="unit"
                      onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, unit: e.target.value } : it))}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 w-full"
                    />
                  )}
                </div>
                <input
                  type="number" min={1} value={item.quantity}
                  onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 text-right w-full"
                />
                <input
                  type="number" min={0} value={item.unitPrice}
                  onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 text-right w-full"
                />
                <span className="text-sm font-semibold text-gray-700 text-right whitespace-nowrap">
                  {fmtMoney(item.quantity * item.unitPrice)}
                </span>
                <button
                  onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                  className="text-red-300 hover:text-red-500 transition-colors flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notes + Totals */}
      <div className="flex gap-6 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Notes (optional)</p>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={4}
            placeholder="Warranties, timelines, exclusions, terms…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>
        <div className="w-full sm:w-72 shrink-0">
          <div className="flex justify-between py-2 px-3 text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold">{fmtMoney(subtotal)}</span>
          </div>
          <div className="flex items-center gap-2 py-2 px-3 text-sm text-gray-500">
            <span>Tax %</span>
            <input
              type="number" min={0} max={50} value={taxRate}
              onChange={e => setTaxRate(Number(e.target.value))}
              className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-blue-400"
            />
            <span>HST</span>
          </div>
          <div className="flex justify-between py-2 px-3 text-sm">
            <span className="text-gray-500">Tax ({taxRate}%)</span>
            <span className="font-semibold">{fmtMoney(tax)}</span>
          </div>
          <div className="flex justify-between items-baseline mt-1 pt-3 px-3 border-t-2 border-gray-200">
            <span className="font-black text-sm">Total</span>
            <span className="text-xl font-black text-blue-700">{fmtMoney(total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
        <button
          disabled={pending}
          onClick={() => save(false)}
          style={{ background: '#fff', color: '#0f172a', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 14, padding: '13px 18px', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.55 : 1 }}
        >
          Save draft
        </button>

        {isContractor ? (
          <button
            disabled={pending || validItems.length === 0}
            onClick={() => setMode('preview')}
            style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 11, fontWeight: 700, fontSize: 14, padding: '13px 18px', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: (pending || validItems.length === 0) ? 'not-allowed' : 'pointer', opacity: (pending || validItems.length === 0) ? 0.55 : 1 }}
          >
            👁 Preview quote →
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() => save(false)}
            style={{ background: '#2563eb', color: '#fff', border: 0, borderRadius: 11, fontWeight: 700, fontSize: 14, padding: '13px 18px', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.55 : 1 }}
          >
            <FileText size={13} /> {pending ? 'Generating…' : 'Generate Invoice'}
          </button>
        )}
      </div>

      {/* Sales: Quote list */}
      {!isContractor && deal.quotes.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-gray-200 mt-2">
          {deal.quotes.map(q => (
            <div key={q.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-gray-800">{dealQuoteNo(deal.id, q.version)}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  q.status === 'accepted' ? 'bg-green-100 text-green-700' :
                  q.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                  q.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {q.status === 'pending_review' ? 'Pending Review' : q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                </span>
              </div>
              {lineItemsOf(q).length > 0 && (
                <div className="space-y-1">
                  {lineItemsOf(q).map((item, i) => (
                    <div key={i} className="flex justify-between text-xs text-gray-600">
                      <span>{item.description} × {item.quantity} @ {fmtMoney(item.unitPrice)}</span>
                      <span>{fmtMoney(item.quantity * item.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-500 border-t border-gray-100 pt-2 space-y-0.5">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmtMoney(q.subtotal)}</span></div>
                <div className="flex justify-between"><span>Tax</span><span>{fmtMoney(q.tax)}</span></div>
                <div className="flex justify-between font-black text-gray-800"><span>Total</span><span>{fmtMoney(q.total)}</span></div>
              </div>
              {q.notes && <p className="text-xs text-gray-400 italic">{q.notes}</p>}
              {q.pdfUrl && (
                <a href={q.pdfUrl} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  <FileText size={12} /> Download PDF Invoice
                </a>
              )}
              <div className="flex gap-3 items-center flex-wrap">
                {(q.status === 'draft' || q.status === 'submitted' || q.status === 'pending_review') && (
                  <button disabled={pending} onClick={() => openEdit(q)} className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-40">
                    Edit
                  </button>
                )}
                {(q.status === 'draft' || q.status === 'pending_review' || q.status === 'submitted') && (
                  <button
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await updateQuote(q.id, deal.id, {
                          lineItems: lineItemsOf(q),
                          subtotal: q.subtotal ?? 0,
                          tax: q.tax ?? 0,
                          total: q.total ?? 0,
                          notes: q.notes ?? undefined,
                          submit: true,
                        })
                        router.refresh()
                      })
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    Send to Client
                  </button>
                )}
                {(q.status === 'submitted' || q.status === 'pending_review') && (
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (!confirm('Mark this quote as accepted?')) return
                      startTransition(async () => { await acceptQuote(q.id, deal.id); router.refresh() })
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
                  >
                    Accept Quote
                  </button>
                )}
                {q.status !== 'accepted' && (
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (!confirm('Delete this quote?')) return
                      startTransition(async () => { await deleteQuote(q.id, deal.id); router.refresh() })
                    }}
                    className="ml-auto text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Workspace ────────────────────────────────────────────────────────────

type WorkspaceTab = 'plans' | 'takeoff' | 'comments' | 'quote'

const WORKSPACE_TABS: { key: WorkspaceTab; label: string; emoji: string }[] = [
  { key: 'plans',    label: 'View Plans',        emoji: '📄' },
  { key: 'takeoff',  label: 'Takeoff & Measure',  emoji: '📐' },
  { key: 'comments', label: 'Comments',           emoji: '💬' },
  { key: 'quote',    label: 'Build Quote',        emoji: '➤' },
]

export function EstimationWorkspace({
  deal,
  currentUserId,
  pipelinePath,
  role = 'sales',
  readOnly = false,
  job,
  companyName,
  companyLogoUrl,
  companyCredentials,
}: {
  deal: Deal
  currentUserId: string
  pipelinePath: string
  role?: 'sales' | 'contractor'
  readOnly?: boolean
  job?: JobInfo | null
  companyName?: string | null
  companyLogoUrl?: string | null
  companyCredentials?: string | null
}) {
  const isContractor = role === 'contractor'
  const isSales = !isContractor

  const displayTitle = isContractor ? deal.lead.address : (deal.projectName || deal.lead.address)

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('quote')

  return (
    <div>
      {/* Back button */}
      <Link
        href={pipelinePath}
        style={{ color: '#64748b', fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14, textDecoration: 'none' }}
        className="hover:text-[#0f172a] transition-colors"
      >
        ← {isContractor ? 'Back to jobs' : 'Back to Pipeline'}
      </Link>

      {/* Job header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px', color: '#0f172a' }}>
            {displayTitle}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#64748b', fontSize: 14, flexWrap: 'wrap' }}>
            <span>📍 {deal.lead.address}</span>
            {(job?.serviceType || job?.contractorType) && (
              <span>🏷️ {job.serviceType ?? job.contractorType}</span>
            )}
            {!isContractor && deal.clientName && (
              <span>🏢 {deal.clientName}</span>
            )}
          </div>
        </div>
        {isContractor && deal.lead.source === 'referral' && (
          <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '12.5px', fontWeight: 600, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
            From referral
          </span>
        )}
        {!isContractor && (
          <Link
            href={`${pipelinePath.replace('/pipeline', '')}/deals/${deal.id}`}
            className="shrink-0 text-xs font-bold px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Deal Detail
          </Link>
        )}
      </div>

      {/* Status cards */}
      <StatusCards deal={deal} job={job} />

      {/* Job overview */}
      <JobOverviewSection deal={deal} job={job} isSales={isSales} />

      {/* Workspace tabs */}
      <div className="flex overflow-x-auto" style={{ gap: 28, borderBottom: '1px solid #e7e8ef', margin: '8px 0 0', padding: '0 4px' }}>
        {WORKSPACE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '14px 2px',
              fontSize: '14.5px',
              fontWeight: 600,
              color: activeTab === t.key ? '#2563eb' : '#64748b',
              border: 0,
              background: 'none',
              borderBottom: `2px solid ${activeTab === t.key ? '#2563eb' : 'transparent'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              marginBottom: -1,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ paddingTop: 22 }}>
        <div style={{ background: '#fff', border: '1px solid #e7e8ef', borderRadius: 16, boxShadow: '0 1px 2px rgba(15,23,42,.04),0 10px 30px rgba(15,23,42,.06)' }}>
          <div style={{ padding: '22px 24px' }}>
            {activeTab === 'plans' && (
              <ConstructionPlansSection deal={deal} isSales={isSales} isContractor={isContractor} />
            )}
            {activeTab === 'takeoff' && (
              <TakeoffSection deal={deal} readOnly={readOnly} />
            )}
            {activeTab === 'comments' && (
              <QuestionsSection deal={deal} currentUserId={currentUserId} />
            )}
            {activeTab === 'quote' && (
              <BuildQuoteSection deal={deal} isContractor={isContractor} job={job} companyName={companyName} companyLogoUrl={companyLogoUrl} companyCredentials={companyCredentials} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
