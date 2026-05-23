'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Plus, Trash2, Upload, FileText, MessageSquare, Ruler, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addDealPlan, deleteDealPlan, addMeasurement, deleteMeasurement, addComment } from '@/app/actions/estimation'
import { createQuote, updateQuote, acceptQuote, deleteQuote, updateDeal } from '@/app/actions/sales'

const PLAN_TYPES = ['Floor Plan', 'Elevation', 'Electrical', 'Plumbing', 'HVAC', 'Other']
const CONTRACTOR_UPLOAD_TYPES = ['Site Photo', 'Field Measurement', 'Reference Image', 'Other']
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
const MEASUREMENT_TYPES = [
  { key: 'area', label: 'Area', units: ['sq ft', 'sq m'] },
  { key: 'linear', label: 'Linear', units: ['ft', 'm', 'lf'] },
  { key: 'count', label: 'Count', units: ['ea', 'pcs'] },
]

type Plan = { id: string; name: string; planType: string; fileUrl: string; fileType: string; uploadedByRole: string | null }
type Measurement = { id: string; label: string; type: string; value: number; unit: string; notes: string | null }
type Comment = { id: string; content: string; createdAt: Date; author: { id: string; firstName: string | null; lastName: string | null; email: string } }
type LineItem = { description: string; quantity: number; unitPrice: number }
type Quote = { id: string; version: number; lineItems: unknown; subtotal: number | null; tax: number | null; total: number | null; status: string; notes: string | null; pdfUrl: string | null; createdAt: Date }
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

// ── View Plans Tab ─────────────────────────────────────────────────────────
function ViewPlansTab({ deal, canUpload, isContractor, readOnly }: { deal: Deal; canUpload: boolean; isContractor: boolean; readOnly?: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const contractorFileRef = useRef<HTMLInputElement>(null)
  const [planType, setPlanType] = useState(PLAN_TYPES[0])
  const [planName, setPlanName] = useState('')
  const [contractorPlanType, setContractorPlanType] = useState(CONTRACTOR_UPLOAD_TYPES[0])
  const [contractorPlanName, setContractorPlanName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Unsupported file type. Please upload a PDF or image (PNG/JPG/WEBP).')
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
      const fileUrl = data.publicUrl
      const name = planName.trim() || file.name.replace(/\.[^.]+$/, '')
      startTransition(async () => {
        await addDealPlan(deal.id, { name, planType, fileUrl, fileType: file.type })
        router.refresh()
      })
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleContractorFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Unsupported file type. Please upload a PDF or image (PNG/JPG/WEBP).')
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
      const fileUrl = data.publicUrl
      const name = contractorPlanName.trim() || file.name.replace(/\.[^.]+$/, '')
      startTransition(async () => {
        await addDealPlan(deal.id, { name, planType: contractorPlanType, fileUrl, fileType: file.type })
        router.refresh()
      })
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (contractorFileRef.current) contractorFileRef.current.value = ''
    }
  }

  function remove(planId: string) {
    if (!confirm('Remove this plan?')) return
    startTransition(async () => {
      await deleteDealPlan(planId, deal.id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Upload — Sales only */}
      {canUpload && !readOnly && <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-black text-gray-800 mb-4">Upload Plan</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Plan Type</label>
            <select
              value={planType}
              onChange={e => setPlanType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              {PLAN_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Name (optional)</label>
            <input
              type="text"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              placeholder="e.g. Ground Floor"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleFile} className="hidden" />
        <button
          disabled={uploading || pending}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Upload size={14} />
          {uploading ? 'Uploading…' : 'Choose File'}
        </button>
        {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
        <p className="mt-2 text-xs text-gray-400">Supported: PDF, PNG, JPG, WEBP</p>
      </div>}

      {/* Upload — Contractor */}
      {isContractor && !readOnly && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
          <h3 className="text-sm font-black text-indigo-800 mb-4">Upload Site Files</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">File Type</label>
              <select
                value={contractorPlanType}
                onChange={e => setContractorPlanType(e.target.value)}
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              >
                {CONTRACTOR_UPLOAD_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Name (optional)</label>
              <input
                type="text"
                value={contractorPlanName}
                onChange={e => setContractorPlanName(e.target.value)}
                placeholder="e.g. Living Room"
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <input ref={contractorFileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleContractorFile} className="hidden" />
          <button
            disabled={uploading || pending}
            onClick={() => contractorFileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Choose File'}
          </button>
          {uploadError && <p className="mt-2 text-xs text-red-500">{uploadError}</p>}
          <p className="mt-2 text-xs text-indigo-400">Supported: PDF, PNG, JPG, WEBP</p>
        </div>
      )}

      {/* Plan list */}
      {deal.plans.length === 0 ? (
        <div className="text-center py-12 text-gray-300">
          <FileText size={32} className="mx-auto mb-2" />
          <p className="text-sm">No plans uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {deal.plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{plan.name}</p>
                <p className="text-xs text-gray-400">{plan.planType}</p>
                <a
                  href={plan.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  Open file ↗
                </a>
              </div>
              {!readOnly && (canUpload || (isContractor && plan.uploadedByRole === 'CONTRACTOR')) && (
                <button
                  disabled={pending}
                  onClick={() => remove(plan.id)}
                  className="shrink-0 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-800">Plan Preview</span>
              <button onClick={() => setPreviewUrl(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {previewUrl.endsWith('.pdf') || previewUrl.includes('pdf')
                ? <iframe src={previewUrl} className="w-full h-full min-h-[70vh]" />
                : <img src={previewUrl} alt="Plan" className="max-w-full mx-auto" />
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Measurements Tab ────────────────────────────────────────────────────────
function MeasurementsTab({ deal, readOnly }: { deal: Deal; readOnly?: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [label, setLabel] = useState('')
  const [type, setType] = useState('area')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('sq ft')
  const [notes, setNotes] = useState('')

  const currentType = MEASUREMENT_TYPES.find(t => t.key === type)!

  function handleTypeChange(newType: string) {
    setType(newType)
    const t = MEASUREMENT_TYPES.find(m => m.key === newType)!
    setUnit(t.units[0])
  }

  function submit() {
    if (!label.trim() || !value) return
    startTransition(async () => {
      await addMeasurement(deal.id, {
        label: label.trim(),
        type,
        value: parseFloat(value),
        unit,
        notes: notes.trim() || undefined,
      })
      router.refresh()
      setLabel(''); setValue(''); setNotes(''); setShowForm(false)
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMeasurement(id, deal.id)
      router.refresh()
    })
  }

  const byType = (t: string) => deal.measurements.filter(m => m.type === t)

  const totalArea = deal.measurements.filter(m => m.type === 'area').reduce((s, m) => s + m.value, 0)
  const totalLinear = deal.measurements.filter(m => m.type === 'linear').reduce((s, m) => s + m.value, 0)
  const totalCount = deal.measurements.filter(m => m.type === 'count').reduce((s, m) => s + m.value, 0)

  return (
    <div className="space-y-5">
      {/* Summary */}
      {deal.measurements.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Area', value: totalArea.toFixed(1), unit: 'sq ft' },
            { label: 'Total Linear', value: totalLinear.toFixed(1), unit: 'ft' },
            { label: 'Total Count', value: totalCount, unit: 'items' },
          ].map(s => (
            <div key={s.label} className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-0.5">{s.label}</p>
              <p className="text-xl font-black text-blue-700">{s.value}</p>
              <p className="text-[10px] text-blue-400">{s.unit}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {!readOnly && showForm ? (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-black text-gray-800">Add Measurement</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 sm:col-span-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Type</label>
              <div className="flex gap-1">
                {MEASUREMENT_TYPES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => handleTypeChange(t.key)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      type === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Label</label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Living Room"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Value</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Unit</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                >
                  {currentType.units.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional details…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={!label.trim() || !value || pending}
              onClick={submit}
              className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : !readOnly ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus size={14} /> Add Measurement
        </button>
      ) : null}

      {/* Measurement groups */}
      {deal.measurements.length === 0 ? (
        <div className="text-center py-12 text-gray-300">
          <Ruler size={32} className="mx-auto mb-2" />
          <p className="text-sm">No measurements yet</p>
        </div>
      ) : (
        MEASUREMENT_TYPES.map(t => {
          const items = byType(t.key)
          if (items.length === 0) return null
          return (
            <div key={t.key}>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">{t.label}</p>
              <div className="space-y-2">
                {items.map(m => (
                  <div key={m.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                      {m.notes && <p className="text-xs text-gray-400">{m.notes}</p>}
                    </div>
                    <p className="text-sm font-black text-gray-700 shrink-0">{m.value} {m.unit}</p>
                    {!readOnly && (
                      <button
                        disabled={pending}
                        onClick={() => remove(m.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Comments Tab ────────────────────────────────────────────────────────────
function CommentsTab({ deal, currentUserId, readOnly }: { deal: Deal; currentUserId: string; readOnly?: boolean }) {
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

  function authorName(a: Comment['author']) {
    if (a.firstName || a.lastName) return `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim()
    return a.email
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {deal.comments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-300">
          <MessageSquare size={32} className="mb-2" />
          <p className="text-sm">No comments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deal.comments.map(c => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-black text-gray-700">{authorName(c.author)}</span>
                <span className="text-[10px] text-gray-400">
                  {new Date(c.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {!readOnly && (
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Add a comment or question…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          />
          <button
            disabled={!text.trim() || pending}
            onClick={submit}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Send size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Quote Tab ───────────────────────────────────────────────────────────────
function QuoteTab({ deal, isContractor, readOnly }: { deal: Deal; isContractor: boolean; readOnly?: boolean }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [taxRate, setTaxRate] = useState(13)
  const [notes, setNotes] = useState('')

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const tax = (subtotal * taxRate) / 100
  const total = subtotal + tax

  function openNew() { setItems([{ description: '', quantity: 1, unitPrice: 0 }]); setTaxRate(13); setNotes(''); setEditingId(null); setShowForm(true) }
  function openEdit(q: Quote) {
    try { setItems((q.lineItems as LineItem[]) ?? []) } catch { setItems([]) }
    setTaxRate(q.subtotal && q.tax ? Math.round((q.tax / q.subtotal) * 100) : 13)
    setNotes(q.notes ?? '')
    setEditingId(q.id)
    setShowForm(true)
  }

  function save(doSubmit: boolean, generatePdf = false) {
    const valid = items.filter(i => i.description.trim())
    if (valid.length === 0) { alert('Add at least one line item.'); return }
    startTransition(async () => {
      const payload = { lineItems: valid, subtotal, tax, total, notes: notes || undefined, submit: doSubmit, generatePdf }
      if (editingId) { await updateQuote(editingId, deal.id, payload) } else { await createQuote(deal.id, payload) }
      router.refresh(); setShowForm(false)
    })
  }

  function fmtMoney(n: number | null) { return n == null ? '—' : '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
  const lineItems = (q: Quote): LineItem[] => { try { return (q.lineItems as LineItem[]) ?? [] } catch { return [] } }

  return (
    <div className="space-y-4">
      {!showForm && !readOnly && (
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors">
          <Plus size={14} /> New Quote
        </button>
      )}

      {showForm && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-4">
          <h3 className="text-sm font-black text-gray-800">{editingId ? 'Edit Quote' : 'New Quote'}</h3>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" placeholder="Description" value={item.description} onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))} />
                <input type="number" min={1} className="w-16 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" placeholder="Qty" value={item.quantity} onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))} />
                <input type="number" min={0} className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" placeholder="Unit $" value={item.unitPrice} onChange={e => setItems(p => p.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))} />
                <span className="text-xs text-gray-500 w-20 text-right shrink-0">${(item.quantity * item.unitPrice).toFixed(2)}</span>
                <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400 transition-colors"><X size={14} /></button>
              </div>
            ))}
            <button onClick={() => setItems(p => [...p, { description: '', quantity: 1, unitPrice: 0 }])} className="text-sm text-blue-600 hover:underline">+ Add line item</button>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600 flex items-center gap-2">
              Tax %
              <input type="number" min={0} max={100} className="w-16 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} />
            </label>
            <div className="ml-auto text-sm text-right space-y-0.5">
              <div className="text-gray-500">Subtotal: <span className="font-medium text-gray-800">{fmtMoney(subtotal)}</span></div>
              <div className="text-gray-500">Tax ({taxRate}%): <span className="font-medium text-gray-800">{fmtMoney(tax)}</span></div>
              <div className="font-black text-gray-900">Total: {fmtMoney(total)}</div>
            </div>
          </div>
          <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" rows={2} placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="flex gap-2 flex-wrap">
            <button disabled={pending} onClick={() => save(false)} className="px-4 py-2 text-sm font-bold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-40 transition-colors">Save Draft</button>
            <button disabled={pending} onClick={() => save(false, true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">
              <FileText size={13} /> Generate Invoice
            </button>
            <button onClick={() => setShowForm(false)} className="ml-auto text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {deal.quotes.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-300">
          <p className="text-sm">No quotes yet</p>
        </div>
      )}

      {deal.quotes.map(q => (
        <div key={q.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-gray-800">Quote v{q.version}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              q.status === 'accepted'      ? 'bg-green-100 text-green-700' :
              q.status === 'submitted'     ? 'bg-blue-100 text-blue-700' :
              q.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {q.status === 'pending_review'
                ? isContractor ? 'Submitted' : 'Pending Review'
                : q.status.charAt(0).toUpperCase() + q.status.slice(1)}
            </span>
          </div>
          {lineItems(q).length > 0 && (
            <div className="space-y-1">
              {lineItems(q).map((item, i) => (
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
          {!readOnly && (
            <div className="flex gap-3 items-center flex-wrap">
              {(q.status === 'draft' || (!isContractor && (q.status === 'submitted' || q.status === 'pending_review'))) && (
                <button disabled={pending} onClick={() => openEdit(q)} className="text-xs font-bold text-blue-600 hover:underline">Edit</button>
              )}
              {(q.status === 'draft' || (!isContractor && (q.status === 'pending_review' || q.status === 'submitted'))) && (
                <button
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await updateQuote(q.id, deal.id, {
                        lineItems: lineItems(q),
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
                  {isContractor ? 'Submit to Sales' : 'Submit to Client'}
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
          )}
        </div>
      ))}
    </div>
  )
}

// ── Site Visit Editor (Sales only) ─────────────────────────────────────────
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
    <div className="mt-3 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
      <span className="text-base">📅</span>
      <span className="text-sm font-black text-blue-700 shrink-0">Site Visit:</span>
      <input
        type="datetime-local"
        value={value}
        onChange={handleChange}
        disabled={pending}
        className="text-sm text-blue-700 bg-transparent border-none outline-none cursor-pointer disabled:opacity-50"
      />
      {!value && <span className="text-sm text-blue-400 italic">Not scheduled</span>}
    </div>
  )
}

// ── Main Workspace ─────────────────────────────────────────────────────────
const TABS = [
  { key: 'plans', label: 'View Plans', icon: FileText },
  { key: 'measurements', label: 'Takeoff & Measure', icon: Ruler },
  { key: 'comments', label: 'Comments', icon: MessageSquare },
  { key: 'quote', label: 'Submit Quote', icon: Send },
]

function maskAddress(address: string): string {
  const parts = address.split(',').map(s => s.trim())
  if (parts.length >= 3) return `${parts[1]}, ${parts[2].replace(/\s+\S+$/, '').trim()}`
  if (parts.length >= 2) return parts[1]
  return 'Location withheld'
}

export function EstimationWorkspace({
  deal,
  currentUserId,
  pipelinePath,
  role = 'sales',
  readOnly = false,
}: {
  deal: Deal
  currentUserId: string
  pipelinePath: string
  role?: 'sales' | 'contractor'
  readOnly?: boolean
}) {
  const [activeTab, setActiveTab] = useState('plans')
  const isContractor = role === 'contractor'
  const canUpload = !isContractor

  const displayTitle = isContractor
    ? deal.lead.address
    : (deal.projectName || deal.lead.address)

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href={pipelinePath} className="text-sm text-blue-600 hover:underline">
          {isContractor ? '← Jobs' : '← Pipeline'}
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{displayTitle}</h1>
            <div className="flex items-center gap-2 mt-1">
              {!isContractor && deal.clientName && <span className="text-sm text-gray-500">{deal.clientName}</span>}
              {deal.projectType && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{deal.projectType}</span>}
              {deal.lead.phase && <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">{deal.lead.phase}</span>}
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
        {isContractor ? (
          deal.siteVisitDate && (
            <div className="mt-3 flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700">
              <span className="text-base">📅</span>
              <span>
                <span className="font-black">Site Visit:</span>{' '}
                {new Date(deal.siteVisitDate).toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {new Date(deal.siteVisitDate).getHours() + new Date(deal.siteVisitDate).getMinutes() > 0 && (
                  <span className="ml-1">
                    @ {new Date(deal.siteVisitDate).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </span>
            </div>
          )
        ) : (
          <SiteVisitEditor dealId={deal.id} initialDate={deal.siteVisitDate} />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'plans' && <ViewPlansTab deal={deal} canUpload={canUpload} isContractor={isContractor} readOnly={readOnly} />}
        {activeTab === 'measurements' && <MeasurementsTab deal={deal} readOnly={readOnly} />}
        {activeTab === 'comments' && <CommentsTab deal={deal} currentUserId={currentUserId} />}
        {activeTab === 'quote' && <QuoteTab deal={deal} isContractor={isContractor} readOnly={isContractor ? false : readOnly} />}
      </div>
    </div>
  )
}
