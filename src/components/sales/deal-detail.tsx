'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateDeal,
  markDealWon,
  markDealLost,
  createQuote,
  updateQuote,
  submitDraftQuote,
  acceptQuote,
} from '@/app/actions/sales'

const STAGE_ORDER = ['NEW_OPPORTUNITY', 'DISCOVERY', 'ESTIMATION', 'QUOTE_SENT', 'NEGOTIATION']
const STAGE_LABELS: Record<string, string> = {
  NEW_OPPORTUNITY: 'New Opportunity',
  DISCOVERY: 'Discovery',
  ESTIMATION: 'Estimation',
  QUOTE_SENT: 'Quote Sent',
  NEGOTIATION: 'Negotiation',
}

type LeadContact = { id: string; name: string | null; email: string | null; phone: string | null; role: string | null }
type Quote = {
  id: string
  version: number
  lineItems: unknown
  subtotal: number | null
  tax: number | null
  total: number | null
  status: string
  notes: string | null
  createdAt: Date
  submittedAt: Date | null
}
type Deal = {
  id: string
  leadId: string
  projectName: string | null
  clientName: string | null
  projectType: string | null
  phase: string | null
  estimatedValue: number | null
  currentStage: string
  ownerId: string | null
  status: string
  lossReason: string | null
  notes: string | null
  siteVisitDate: Date | null
  deadline: Date | null
  negotiationDate: Date | null
  lead: { address: string; phase: string | null; contacts: LeadContact[]; businessName: string | null }
  quotes: Quote[]
}
type User = { id: string; firstName: string | null; lastName: string | null; email: string }

type LineItem = { description: string; quantity: number; unitPrice: number }

function fmtDate(d: Date | null) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

function fmtMoney(n: number | null) {
  if (n == null) return '—'
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Quote Form ─────────────────────────────────────────────────────────────
function QuoteForm({
  dealId,
  editQuote,
  onClose,
}: {
  dealId: string
  editQuote?: Quote
  onClose: () => void
}) {
  const parseItems = (): LineItem[] => {
    try { return (editQuote?.lineItems as LineItem[]) ?? [] } catch { return [] }
  }
  const parseTaxRate = (): number => {
    if (!editQuote || !editQuote.subtotal || !editQuote.tax) return 13
    return Math.round((editQuote.tax / editQuote.subtotal) * 100)
  }

  const [items, setItems] = useState<LineItem[]>(
    editQuote ? parseItems() : [{ description: '', quantity: 1, unitPrice: 0 }]
  )
  const [taxRate, setTaxRate] = useState(parseTaxRate())
  const [notes, setNotes] = useState(editQuote?.notes ?? '')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const tax = (subtotal * taxRate) / 100
  const total = subtotal + tax

  function setItem(idx: number, field: keyof LineItem, val: string | number) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it)))
  }
  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }])
  }
  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function submit(doSubmit: boolean) {
    startTransition(async () => {
      const payload = { lineItems: items, subtotal, tax, total, notes: notes || undefined, submit: doSubmit }
      if (editQuote) {
        await updateQuote(editQuote.id, dealId, payload)
      } else {
        await createQuote(dealId, payload)
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4">
      <h3 className="font-semibold text-gray-800">{editQuote ? `Edit Quote v${editQuote.version}` : 'New Quote'}</h3>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Description"
              value={item.description}
              onChange={e => setItem(idx, 'description', e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Qty"
              value={item.quantity}
              onChange={e => setItem(idx, 'quantity', Number(e.target.value))}
            />
            <input
              type="number"
              min={0}
              className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Unit $"
              value={item.unitPrice}
              onChange={e => setItem(idx, 'unitPrice', Number(e.target.value))}
            />
            <span className="text-sm text-gray-600 w-20 text-right">
              ${(item.quantity * item.unitPrice).toFixed(2)}
            </span>
            <button
              onClick={() => removeItem(idx)}
              className="text-red-400 hover:text-red-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
        <button onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Add line item</button>
      </div>

      <div className="flex gap-4 items-center">
        <label className="text-sm text-gray-600">
          Tax %
          <input
            type="number"
            min={0}
            max={100}
            className="ml-2 w-16 border border-gray-300 rounded px-2 py-1 text-sm"
            value={taxRate}
            onChange={e => setTaxRate(Number(e.target.value))}
          />
        </label>
        <div className="ml-auto text-sm text-gray-700 space-y-0.5 text-right">
          <div>Subtotal: <span className="font-medium">{fmtMoney(subtotal)}</span></div>
          <div>Tax ({taxRate}%): <span className="font-medium">{fmtMoney(tax)}</span></div>
          <div className="font-bold text-gray-900">Total: {fmtMoney(total)}</div>
        </div>
      </div>

      <textarea
        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
        rows={2}
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => submit(false)}
          className="px-3 py-1.5 rounded text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40"
        >
          Save Draft
        </button>
        <button
          disabled={pending}
          onClick={() => submit(true)}
          className="px-3 py-1.5 rounded text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Submit to Client
        </button>
        <button onClick={onClose} className="ml-auto text-sm text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Mark Lost Modal ────────────────────────────────────────────────────────
function LostModal({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function submit() {
    if (!reason.trim()) return
    startTransition(async () => {
      await markDealLost(dealId, reason.trim())
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Mark Deal as Lost</h2>
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          rows={3}
          placeholder="Reason for losing this deal..."
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            disabled={pending || !reason.trim()}
            onClick={submit}
            className="px-4 py-2 rounded text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
          >
            Confirm Lost
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main DealDetail ────────────────────────────────────────────────────────
export function DealDetail({ deal, users, pipelinePath = '/sales/pipeline' }: { deal: Deal; users: User[]; pipelinePath?: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [showLostModal, setShowLostModal] = useState(false)

  // Editable fields
  const [projectName, setProjectName] = useState(deal.projectName ?? '')
  const [clientName, setClientName] = useState(deal.clientName ?? '')
  const [projectType, setProjectType] = useState(deal.projectType ?? '')
  const [estimatedValue, setEstimatedValue] = useState(deal.estimatedValue?.toString() ?? '')
  const [ownerId, setOwnerId] = useState(deal.ownerId ?? '')
  const [notes, setNotes] = useState(deal.notes ?? '')
  const [siteVisitDate, setSiteVisitDate] = useState(fmtDate(deal.siteVisitDate))
  const [deadline, setDeadline] = useState(fmtDate(deal.deadline))
  const [negotiationDate, setNegotiationDate] = useState(fmtDate(deal.negotiationDate))

  const isDone = deal.status === 'won' || deal.status === 'lost'
  const stageIdx = STAGE_ORDER.indexOf(deal.currentStage)

  function save() {
    startTransition(async () => {
      await updateDeal(deal.id, {
        projectName: projectName || null,
        clientName: clientName || null,
        projectType: projectType || null,
        estimatedValue: estimatedValue ? Number(estimatedValue) : null,
        ownerId: ownerId || null,
        notes: notes || null,
        siteVisitDate: siteVisitDate ? new Date(siteVisitDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        negotiationDate: negotiationDate ? new Date(negotiationDate) : null,
      })
      router.refresh()
    })
  }

  function win() {
    startTransition(async () => {
      await markDealWon(deal.id)
      router.refresh()
    })
  }

  function submitDraft(quoteId: string) {
    startTransition(async () => {
      await submitDraftQuote(quoteId, deal.id)
      router.refresh()
    })
  }

  function acceptQ(quoteId: string) {
    startTransition(async () => {
      await acceptQuote(quoteId, deal.id)
      router.refresh()
    })
  }

  const lineItems = (q: Quote): LineItem[] => {
    try { return (q.lineItems as LineItem[]) ?? [] } catch { return [] }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {showLostModal && <LostModal dealId={deal.id} onClose={() => setShowLostModal(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={pipelinePath} className="text-sm text-blue-600 hover:underline">← Pipeline</Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {deal.projectName || deal.lead.address}
          </h1>
          <p className="text-sm text-gray-500">{deal.lead.address}</p>
        </div>
        {isDone ? (
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${deal.status === 'won' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {deal.status === 'won' ? '✓ Won' : '✗ Lost'}
          </span>
        ) : (
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={win}
              className="px-3 py-1.5 rounded text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
            >
              Mark Won
            </button>
            <button
              disabled={pending}
              onClick={() => setShowLostModal(true)}
              className="px-3 py-1.5 rounded text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40"
            >
              Mark Lost
            </button>
          </div>
        )}
      </div>

      {deal.status === 'lost' && deal.lossReason && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <span className="font-semibold">Loss reason:</span> {deal.lossReason}
        </div>
      )}

      {/* Stage bar */}
      {!isDone && (
        <div className="flex gap-1">
          {STAGE_ORDER.map((s, i) => (
            <div key={s} className="flex-1 text-center">
              <div className={`h-1.5 rounded-full mb-1 ${i <= stageIdx ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <span className={`text-[10px] font-semibold ${i === stageIdx ? 'text-blue-700' : 'text-gray-400'}`}>
                {STAGE_LABELS[s]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left: editable fields */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Deal Info</h2>

            <label className="block text-xs text-gray-500">
              Project Name
              <input
                disabled={isDone}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              />
            </label>

            <label className="block text-xs text-gray-500">
              Client Name
              <input
                disabled={isDone}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
            </label>

            <label className="block text-xs text-gray-500">
              Project Type
              <input
                disabled={isDone}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={projectType}
                onChange={e => setProjectType(e.target.value)}
              />
            </label>

            <label className="block text-xs text-gray-500">
              Estimated Value ($)
              <input
                disabled={isDone}
                type="number"
                min={0}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={estimatedValue}
                onChange={e => setEstimatedValue(e.target.value)}
              />
            </label>

            <label className="block text-xs text-gray-500">
              Owner
              <select
                disabled={isDone}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.firstName || u.lastName ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : u.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-gray-500">
              Notes
              <textarea
                disabled={isDone}
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Key Dates</h2>

            <label className="block text-xs text-gray-500">
              Site Visit Date
              <input
                disabled={isDone}
                type="date"
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={siteVisitDate}
                onChange={e => setSiteVisitDate(e.target.value)}
              />
            </label>

            <label className="block text-xs text-gray-500">
              Deadline
              <input
                disabled={isDone}
                type="date"
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </label>

            <label className="block text-xs text-gray-500">
              Negotiation Date
              <input
                disabled={isDone}
                type="date"
                className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                value={negotiationDate}
                onChange={e => setNegotiationDate(e.target.value)}
              />
            </label>
          </div>

          {!isDone && (
            <button
              disabled={pending}
              onClick={save}
              className="w-full py-2 rounded text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Save Changes
            </button>
          )}
        </div>

        {/* Right: lead info + quotes */}
        <div className="space-y-4">
          {/* Lead contacts */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
            <h2 className="font-semibold text-gray-700">Lead Info</h2>
            <p className="text-sm text-gray-600">{deal.lead.address}</p>
            {deal.lead.businessName && (
              <p className="text-sm text-gray-500">{deal.lead.businessName}</p>
            )}
            {deal.lead.phase && (
              <span className="inline-block text-[11px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                {deal.lead.phase}
              </span>
            )}
            {deal.lead.contacts.length > 0 && (
              <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                {deal.lead.contacts.map(c => (
                  <div key={c.id} className="text-xs text-gray-600">
                    <span className="font-medium">{c.name}</span>
                    {c.role && <span className="text-gray-400"> · {c.role}</span>}
                    {c.phone && <span> · {c.phone}</span>}
                    {c.email && <span> · {c.email}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quotes */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Quotes</h2>
              {!isDone && !showQuoteForm && !editingQuote && (
                <button
                  onClick={() => setShowQuoteForm(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + New Quote
                </button>
              )}
            </div>

            {showQuoteForm && (
              <QuoteForm dealId={deal.id} onClose={() => setShowQuoteForm(false)} />
            )}

            {editingQuote && (
              <QuoteForm
                dealId={deal.id}
                editQuote={editingQuote}
                onClose={() => setEditingQuote(null)}
              />
            )}

            {deal.quotes.length === 0 && !showQuoteForm && (
              <p className="text-sm text-gray-400">No quotes yet.</p>
            )}

            {deal.quotes.map(q => (
              <div key={q.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Quote v{q.version}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    q.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    q.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                  </span>
                </div>

                {lineItems(q).length > 0 && (
                  <div className="space-y-0.5">
                    {lineItems(q).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600">
                        <span>{item.description} × {item.quantity}</span>
                        <span>{fmtMoney(item.quantity * item.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-0.5 border-t border-gray-100 pt-1">
                  <div className="flex justify-between">
                    <span>Subtotal</span><span>{fmtMoney(q.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span><span>{fmtMoney(q.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800">
                    <span>Total</span><span>{fmtMoney(q.total)}</span>
                  </div>
                </div>

                {q.notes && <p className="text-xs text-gray-500 italic">{q.notes}</p>}

                {q.status === 'draft' && !isDone && (
                  <div className="flex gap-2 mt-1">
                    <button
                      disabled={pending}
                      onClick={() => { setShowQuoteForm(false); setEditingQuote(q) }}
                      className="px-3 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => submitDraft(q.id)}
                      className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      Submit to Client
                    </button>
                  </div>
                )}

                {q.status === 'submitted' && !isDone && (
                  <button
                    disabled={pending}
                    onClick={() => acceptQ(q.id)}
                    className="mt-1 px-3 py-1 rounded text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
                  >
                    Mark Accepted
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
