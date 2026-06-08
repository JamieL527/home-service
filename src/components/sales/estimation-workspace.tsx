'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  X, Plus, Trash2, Upload, FileText, MessageSquare, Ruler, Send,
  ZoomIn, ZoomOut, Maximize2, Download, Sparkles, Calendar,
  CheckCircle, AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addDealPlan, deleteDealPlan, addMeasurement, deleteMeasurement, addComment } from '@/app/actions/estimation'
import { createQuote, updateQuote, acceptQuote, deleteQuote, updateDeal } from '@/app/actions/sales'

const PLAN_TYPES = ['Floor Plan', 'Elevation', 'Foundation', 'Framing', 'Electrical', 'Plumbing', 'HVAC']
const CONTRACTOR_UPLOAD_TYPES = ['Site Photo', 'Field Measurement', 'Reference Image', 'Other']
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const UNITS = ['sqft', 'sq m', 'ft', 'm', 'lf', 'ea', 'pcs', 'hrs']

type Plan = { id: string; name: string; planType: string; fileUrl: string; fileType: string; uploadedByRole: string | null }
type Measurement = { id: string; label: string; type: string; value: number; unit: string; notes: string | null }
type Comment = {
  id: string; content: string; createdAt: Date
  author: { id: string; firstName: string | null; lastName: string | null; email: string; role: string }
}
type LineItem = { description: string; quantity: number; unitPrice: number }
type Quote = {
  id: string; version: number; lineItems: unknown; subtotal: number | null; tax: number | null
  total: number | null; status: string; notes: string | null; pdfUrl: string | null; createdAt: Date
}
type Deal = {
  id: string
  projectName: string | null
  clientName: string | null
  projectType: string | null
  currentStage: string
  siteVisitDate: Date | null
  lead: { address: string; phase: string | null }
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Deadline</p>
        {endDate ? (
          <>
            <p className="text-sm font-bold text-gray-900">{fmtDate(endDate)}</p>
            <p className={`text-xs font-semibold mt-1 ${days != null && days < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {days != null
                ? days < 0
                  ? `${Math.abs(days)} days overdue`
                  : `${days} days remaining`
                : ''}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400">Not set</p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Site Visit</p>
        {deal.siteVisitDate ? (
          <>
            <p className="text-sm font-bold text-gray-900">
              {new Date(deal.siteVisitDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-xs text-gray-400 mt-1">Scheduled</p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-gray-900">Not scheduled</p>
            <p className="text-xs text-gray-400 mt-1">Pending</p>
          </>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Quote Status</p>
        <p className="text-sm font-bold text-gray-900">{qs.label}</p>
        <p className="text-xs text-gray-400 mt-1">{qs.sub}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Measurements</p>
        <p className="text-sm font-bold text-gray-900">{deal.measurements.length} captured</p>
        <p className="text-xs text-gray-400 mt-1">
          {deal.measurements.length > 0 ? 'Ready for quote' : 'None yet'}
        </p>
      </div>
    </div>
  )
}

// ── Job Overview ──────────────────────────────────────────────────────────────

function JobOverviewSection({ deal, job, isSales }: { deal: Deal; job?: JobInfo | null; isSales: boolean }) {
  const startDate = parseStartDate(job?.timeline ?? null)
  const endDate = parseEndDate(job?.timeline ?? null)

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Job Overview</h2>
        <p className="text-sm text-gray-500">Project scope and timeline details</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Scope of Work</p>
            {job?.scope
              ? <p className="text-sm text-gray-700 leading-relaxed">{job.scope}</p>
              : <p className="text-sm text-gray-400 italic">Not specified</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Trade</p>
            {job?.serviceType || job?.contractorType
              ? <p className="text-sm text-gray-700">{job.serviceType ?? job.contractorType}</p>
              : <p className="text-sm text-gray-400 italic">Not specified</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Project Timeline</p>
            {startDate || endDate ? (
              <div className="space-y-1">
                {startDate && (
                  <p className="text-sm text-gray-700 flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400 shrink-0" /> Start: {fmtDate(startDate)}
                  </p>
                )}
                {endDate && (
                  <p className="text-sm text-gray-700 flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400 shrink-0" /> End: {fmtDate(endDate)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">{job?.timeline || 'Not specified'}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Site Visit</p>
            {isSales ? (
              <SiteVisitEditor dealId={deal.id} initialDate={deal.siteVisitDate} />
            ) : deal.siteVisitDate ? (
              <p className="text-sm text-gray-700 flex items-center gap-1.5">
                <Calendar size={12} className="text-gray-400 shrink-0" />
                {new Date(deal.siteVisitDate).toLocaleDateString('en-CA', {
                  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
            ) : (
              <p className="text-sm text-orange-500 flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" /> Not scheduled yet
              </p>
            )}
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

  // Chips shown: sales sees plan types, contractor also sees their upload types
  const fixedChips = isContractor ? [...PLAN_TYPES, ...CONTRACTOR_UPLOAD_TYPES] : PLAN_TYPES
  const uploadedTypes = [...new Set(deal.plans.map(p => p.planType))]
  const allChips = [...fixedChips, ...uploadedTypes.filter(t => !fixedChips.includes(t))]

  const [selectedType, setSelectedType] = useState(allChips[0])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [zoom, setZoom] = useState(100)

  const selectedPlans = deal.plans.filter(p => p.planType === selectedType)
  const currentPlan = selectedPlans[0]

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
        await addDealPlan(deal.id, { name, planType: selectedType, fileUrl: data.publicUrl, fileType: file.type })
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

  function downloadAll() {
    deal.plans.forEach(p => window.open(p.fileUrl, '_blank'))
  }

  // Sales can delete any plan; contractor can only delete their own uploads
  const canDelete = (plan: Plan) =>
    isSales || (isContractor && plan.uploadedByRole === 'CONTRACTOR')

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Construction Plans</h2>
        <p className="text-sm text-gray-500">View project drawings and specifications</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Controls bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-wrap gap-y-2">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {allChips.map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  selectedType === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFile} className="hidden" />
            <button
              disabled={uploading || pending}
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <Upload size={12} />
              {uploading ? 'Uploading…' : isContractor ? 'Upload File' : 'Upload Plan'}
            </button>
            {deal.plans.length > 0 && (
              <button
                onClick={downloadAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download size={12} /> Download All
              </button>
            )}
          </div>
        </div>

        {uploadError && <p className="px-4 py-2 text-xs text-red-500 bg-red-50 border-b border-red-100">{uploadError}</p>}

        {/* Viewer */}
        <div className="bg-gray-50 relative" style={{ minHeight: 380 }}>
          {currentPlan ? (
            <>
              <div className="absolute top-3 left-3 z-10">
                <span className="bg-white border border-gray-200 shadow-sm rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-700">
                  {currentPlan.name || currentPlan.planType}
                </span>
              </div>
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                <button
                  onClick={() => setZoom(z => Math.max(50, z - 25))}
                  className="p-1.5 bg-white border border-gray-200 shadow-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ZoomOut size={13} className="text-gray-600" />
                </button>
                <span className="px-2 py-1 bg-white border border-gray-200 shadow-sm rounded-lg text-xs font-semibold text-gray-600 min-w-[44px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom(z => Math.min(200, z + 25))}
                  className="p-1.5 bg-white border border-gray-200 shadow-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ZoomIn size={13} className="text-gray-600" />
                </button>
                <button
                  onClick={() => window.open(currentPlan.fileUrl, '_blank')}
                  className="p-1.5 bg-white border border-gray-200 shadow-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Maximize2 size={13} className="text-gray-600" />
                </button>
              </div>

              <div className="overflow-auto" style={{ height: 380 }}>
                {currentPlan.fileType === 'application/pdf' ? (
                  <iframe src={currentPlan.fileUrl} style={{ width: `${zoom}%`, minWidth: '100%', height: 380 }} />
                ) : (
                  <div className="flex items-start justify-center p-6 min-h-full">
                    <img
                      src={currentPlan.fileUrl}
                      alt={currentPlan.name}
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', maxWidth: '100%' }}
                    />
                  </div>
                )}
              </div>

              {canDelete(currentPlan) && (
                <button
                  onClick={() => remove(currentPlan.id)}
                  disabled={pending}
                  className="absolute bottom-3 left-3 z-10 p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center" style={{ height: 380 }}>
              <FileText size={40} className="text-gray-200 mb-3" />
              <p className="text-sm font-semibold text-gray-400">{selectedType} Preview</p>
              <p className="text-xs text-gray-300 mt-1">Plan viewer displays here</p>
            </div>
          )}
        </div>
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
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Takeoff & Measurement</h2>
        <p className="text-sm text-gray-500">Capture quantities and measurements from plans</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            disabled
            title="Coming soon"
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-lg opacity-50 cursor-not-allowed"
          >
            <Sparkles size={14} /> Extract from Plan
          </button>
          <button
            disabled
            title="Coming soon"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border border-gray-200 text-gray-500 rounded-lg opacity-50 cursor-not-allowed"
          >
            <Upload size={13} /> Upload Measurement Document
          </button>
        </div>

        <div className="flex gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 text-xs text-blue-600">
          <FileText size={13} className="shrink-0 mt-0.5" />
          <span>
            Click &ldquo;Extract from Plan&rdquo; to automatically read measurements from the selected plan,
            or manually add measurements below.
          </span>
        </div>

        {deal.measurements.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-300">
            <Ruler size={28} className="mb-2" />
            <p className="text-sm">No measurements yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deal.measurements.map((m, idx) => (
              <div key={m.id} className="flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2.5">
                <span className="text-xs font-bold text-gray-400 w-6 shrink-0">#{idx + 1}</span>
                <p className="flex-1 text-sm text-gray-700 min-w-0 truncate">{m.label}</p>
                <span className="text-sm font-semibold text-gray-900 shrink-0 w-16 text-right">{m.value}</span>
                <span className="text-xs text-gray-400 shrink-0 w-12">{m.unit}</span>
                {!readOnly && (
                  <button
                    disabled={pending}
                    onClick={() => remove(m.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}

            {adding && (
              <div className="flex items-center gap-2 border border-blue-200 bg-blue-50 rounded-lg px-3 py-2.5">
                <span className="text-xs font-bold text-gray-400 w-6 shrink-0">#{deal.measurements.length + 1}</span>
                <input
                  autoFocus
                  placeholder="Measurement name"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRow()}
                  className="flex-1 text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400 min-w-0"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRow()}
                  className="w-20 text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-400 text-right"
                />
                <select
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  className="text-xs bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none"
                >
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
                <button
                  disabled={pending || !newLabel.trim() || !newValue}
                  onClick={addRow}
                  className="text-blue-600 hover:text-blue-700 disabled:opacity-40 shrink-0"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  onClick={() => { setAdding(false); setNewLabel(''); setNewValue('') }}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {!readOnly && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <Plus size={14} /> Add Measurement
          </button>
        )}
      </div>
    </div>
  )
}

// ── Questions ─────────────────────────────────────────────────────────────────

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
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Questions</h2>
        <p className="text-sm text-gray-500">Ask the project team about plans or scope before quoting</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        {deal.comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-300">
            <MessageSquare size={28} className="mb-2" />
            <p className="text-sm">No questions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deal.comments.map(c => {
              const isMe = c.author.id === currentUserId
              return (
                <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {authorInitials(c.author)}
                  </div>
                  <div className={`flex-1 max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-bold text-gray-700">
                        {isMe ? 'You' : authorDisplayName(c.author)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString('en-CA', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className={`rounded-xl px-3 py-2 text-sm text-gray-700 ${isMe ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
                      {c.content}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {currentUserId && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <textarea
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Ask a question about the plans or project scope..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            />
            <div className="flex justify-end">
              <button
                disabled={!text.trim() || pending}
                onClick={submit}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
              >
                <Send size={13} /> Post Question
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Build Quote ───────────────────────────────────────────────────────────────

function BuildQuoteSection({ deal, isContractor }: { deal: Deal; isContractor: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [notes, setNotes] = useState('')
  const taxRate = 13

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const tax = (subtotal * taxRate) / 100
  const total = subtotal + tax

  function openEdit(q: Quote) {
    try { setItems((q.lineItems as LineItem[]) ?? []) } catch { setItems([]) }
    setNotes(q.notes ?? '')
    setEditingId(q.id)
  }

  function resetForm() {
    setItems([{ description: '', quantity: 1, unitPrice: 0 }])
    setNotes('')
    setEditingId(null)
  }

  function save(doSubmit: boolean, generatePdf = false) {
    const valid = items.filter(i => i.description.trim())
    if (valid.length === 0) { alert('Add at least one line item.'); return }
    startTransition(async () => {
      const payload = { lineItems: valid, subtotal, tax, total, notes: notes || undefined, submit: doSubmit, generatePdf }
      if (editingId) { await updateQuote(editingId, deal.id, payload) } else { await createQuote(deal.id, payload) }
      router.refresh()
      resetForm()
    })
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Build Quote</h2>
        <p className="text-sm text-gray-500">Create your detailed pricing proposal</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        {editingId && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-100">
            <span className="text-xs font-semibold text-amber-700">Editing quote</span>
            <button onClick={resetForm} className="text-xs text-gray-400 hover:text-gray-600">Cancel Edit</button>
          </div>
        )}

        {/* Line Items */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-bold text-gray-900">Line Items</span>
            <button
              onClick={() => setItems(p => [...p, { description: '', quantity: 1, unitPrice: 0 }])}
              className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <Plus size={13} /> Add Item
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <div key={idx} className="px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-400 w-6 shrink-0">#{idx + 1}</span>
                  <input
                    placeholder="Item description"
                    value={item.description}
                    onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400 min-w-0"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
                    className="w-14 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 text-center"
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                    className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 text-right"
                  />
                  <button
                    onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                    className="text-red-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-right pr-7">
                  Line Total: {fmtMoney(item.quantity * item.unitPrice)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="px-4 py-4 border-b border-gray-200">
          <p className="text-sm font-bold text-gray-900 mb-2">Additional Notes</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Include warranties, timelines, terms, or other important information..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
          />
        </div>

        {/* Totals */}
        <div className="px-4 py-4 space-y-2 border-b border-gray-200">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span><span>{fmtMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Tax ({taxRate}% HST)</span><span>{fmtMoney(tax)}</span>
          </div>
          <div className="flex justify-between text-base font-black text-gray-900 pt-1 border-t border-gray-100">
            <span>Total</span><span className="text-blue-600">{fmtMoney(total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-4 py-4">
          <button
            disabled={pending}
            onClick={() => save(false)}
            className="flex-1 py-2.5 text-sm font-bold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Save Draft
          </button>
          <button
            disabled={pending}
            onClick={() => save(false, true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <FileText size={13} /> {pending ? 'Generating…' : 'Generate Invoice'}
          </button>
        </div>
      </div>

      {deal.quotes.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-300">
          <p className="text-sm">No quotes yet</p>
        </div>
      )}

      <div className="space-y-4">
        {deal.quotes.map(q => (
          <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-gray-800">Quote v{q.version}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                q.status === 'accepted'       ? 'bg-green-100 text-green-700' :
                q.status === 'submitted'      ? 'bg-blue-100 text-blue-700' :
                q.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {q.status === 'pending_review'
                  ? isContractor ? 'Submitted' : 'Pending Review'
                  : q.status.charAt(0).toUpperCase() + q.status.slice(1)}
              </span>
            </div>
            {lineItemsOf(q).length > 0 && (
              <div className="space-y-1">
                {lineItemsOf(q).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-600">
                    <span>{item.description} × {item.quantity} @ {fmtMoney(item.unitPrice)}</span>
                    <span className="shrink-0 ml-2">{fmtMoney(item.quantity * item.unitPrice)}</span>
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
              <a
                href={q.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                <FileText size={12} /> View PDF Invoice
              </a>
            )}
            <div className="flex gap-3 items-center flex-wrap">
              {(q.status === 'draft' || (!isContractor && (q.status === 'submitted' || q.status === 'pending_review'))) && (
                <button
                  disabled={pending}
                  onClick={() => openEdit(q)}
                  className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-40"
                >
                  Edit
                </button>
              )}
              {(q.status === 'draft' || (!isContractor && (q.status === 'pending_review' || q.status === 'submitted'))) && (
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
                  {isContractor ? 'Submit to Sales' : 'Send to Client'}
                </button>
              )}
              {(q.status === 'submitted' || q.status === 'pending_review') && !isContractor && (
                <button
                  disabled={pending}
                  onClick={() => {
                    if (!confirm('Mark this quote as accepted? The total will be written to Deal Info.')) return
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
    </div>
  )
}

// ── Main Workspace ────────────────────────────────────────────────────────────

export function EstimationWorkspace({
  deal,
  currentUserId,
  pipelinePath,
  role = 'sales',
  readOnly = false,
  job,
}: {
  deal: Deal
  currentUserId: string
  pipelinePath: string
  role?: 'sales' | 'contractor'
  readOnly?: boolean
  job?: JobInfo | null
}) {
  const isContractor = role === 'contractor'
  const isSales = !isContractor

  const displayTitle = isContractor ? deal.lead.address : (deal.projectName || deal.lead.address)

  // Break out of main's padding (p-4 sm:p-6) and fill its exact height
  // so the component manages its own internal scroll instead of main scrolling
  return (
    <div
      className="-m-4 sm:-m-6 flex flex-col"
      style={{ height: 'calc(100dvh - 56px)' }}
    >
      {/* ── Fixed top section (white) ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
        <div className="max-w-4xl mx-auto">
          {/* Back link */}
          <Link
            href={pipelinePath}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 font-semibold mb-3 transition-colors"
          >
            ← {isContractor ? 'Back to Dashboard' : 'Back to Pipeline'}
          </Link>

          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-snug">{displayTitle}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {!isContractor && deal.clientName && (
                  <span className="text-sm text-gray-500">🏢 {deal.clientName}</span>
                )}
                {deal.lead.phase && (
                  <span className="text-xs font-semibold bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
                    {deal.lead.phase}
                  </span>
                )}
                {deal.projectType && (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-2.5 py-0.5">
                    From {deal.projectType}
                  </span>
                )}
              </div>
            </div>
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
        </div>
      </div>

      {/* ── Scrollable gray section ── */}
      <div className="flex-1 overflow-y-auto bg-gray-100 px-4 sm:px-6 py-6 pb-24 sm:pb-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <ConstructionPlansSection deal={deal} isSales={isSales} isContractor={isContractor} />
          <TakeoffSection deal={deal} readOnly={readOnly} />
          <QuestionsSection deal={deal} currentUserId={currentUserId} />
          <BuildQuoteSection deal={deal} isContractor={isContractor} />
        </div>
      </div>
    </div>
  )
}
