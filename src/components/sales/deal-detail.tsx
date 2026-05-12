'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateDeal, markDealWon, markDealLost } from '@/app/actions/sales'

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
  lead: { address: string; phase: string | null; contacts: LeadContact[]; businessName: string | null; initialComment: string | null; marketingNote: string | null }
  quotes: Quote[]
}
type User = { id: string; firstName: string | null; lastName: string | null; email: string }

function fmtDate(d: Date | null) {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

function fmtMoney(n: number | null) {
  if (n == null) return '—'
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
export function DealDetail({ deal, users, pipelinePath = '/sales/pipeline', leadBasePath = '/sales/leads' }: { deal: Deal; users: User[]; pipelinePath?: string; leadBasePath?: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [showLostModal, setShowLostModal] = useState(false)

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
  const acceptedQuote = deal.quotes.find(q => q.status === 'accepted')
  const latestQuote = deal.quotes[0]

  const estimationPath = `${pipelinePath.replace('/pipeline', '')}/deals/${deal.id}/estimation`

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
    if (!acceptedQuote) {
      alert('Please accept a quote in the Estimation Workspace before marking this deal as Won.')
      return
    }
    startTransition(async () => {
      await markDealWon(deal.id)
      router.refresh()
    })
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

      {/* Estimation Workspace banner */}
      {!isDone && (
        <Link
          href={estimationPath}
          className="flex items-center justify-between w-full px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition-colors"
        >
          <div>
            <p className="text-sm font-black text-yellow-800">Estimation Workspace</p>
            <p className="text-xs text-yellow-600">
              {deal.quotes.length === 0
                ? 'Upload plans, record measurements, create quotes'
                : `${deal.quotes.length} quote${deal.quotes.length !== 1 ? 's' : ''}${acceptedQuote ? ' · 1 accepted' : ''} · Click to manage`}
            </p>
          </div>
          <span className="text-yellow-600 font-bold text-lg">→</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left: editable fields */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Deal Info</h2>

            <label className="block text-xs text-gray-500">
              Project Name
              <input disabled={isDone} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={projectName} onChange={e => setProjectName(e.target.value)} />
            </label>

            <label className="block text-xs text-gray-500">
              Client Name
              <input disabled={isDone} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={clientName} onChange={e => setClientName(e.target.value)} />
            </label>

            <label className="block text-xs text-gray-500">
              Project Type
              <input disabled={isDone} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={projectType} onChange={e => setProjectType(e.target.value)} />
            </label>

            <label className="block text-xs text-gray-500">
              Estimated Value ($)
              <input disabled={isDone} type="number" min={0} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={estimatedValue} onChange={e => setEstimatedValue(e.target.value)} />
            </label>

            <label className="block text-xs text-gray-500">
              Assigned To
              <select disabled={isDone} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={ownerId} onChange={e => setOwnerId(e.target.value)}>
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
              <textarea disabled={isDone} className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
            </label>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="font-semibold text-gray-700">Key Dates</h2>

            <label className="block text-xs text-gray-500">
              Site Visit Date
              <input disabled={isDone} type="date" className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={siteVisitDate} onChange={e => setSiteVisitDate(e.target.value)} />
            </label>

            <label className="block text-xs text-gray-500">
              Deadline
              <input disabled={isDone} type="date" className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </label>

            <label className="block text-xs text-gray-500">
              Negotiation Date
              <input disabled={isDone} type="date" className="mt-0.5 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" value={negotiationDate} onChange={e => setNegotiationDate(e.target.value)} />
            </label>
          </div>

          {!isDone && (
            <button disabled={pending} onClick={save} className="w-full py-2 rounded text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
              Save Changes
            </button>
          )}
        </div>

        {/* Right: lead info + quote summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Lead Info</h2>
              <Link href={leadBasePath.startsWith('/admin') ? `${leadBasePath}/${deal.leadId}?from=sales` : `${leadBasePath}/${deal.leadId}`} className="text-[11px] font-bold text-blue-600 bg-white border border-blue-300 hover:bg-blue-600 hover:text-white rounded-md px-2.5 py-0.5 transition-colors">
                Full Details
              </Link>
            </div>
            <p className="text-sm text-gray-600">{deal.lead.address}</p>
            {deal.lead.businessName && <p className="text-sm text-gray-500">{deal.lead.businessName}</p>}
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
            {deal.lead.initialComment && (
              <div className="mt-2 border-t border-gray-100 pt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Field Notes</p>
                <p className="text-xs text-gray-600 leading-relaxed">{deal.lead.initialComment}</p>
              </div>
            )}
            {deal.lead.marketingNote && (
              <div className="mt-2 border-t border-gray-100 pt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-1">Marketing Notes</p>
                <p className="text-xs text-blue-700 leading-relaxed">{deal.lead.marketingNote}</p>
              </div>
            )}
          </div>

          {/* Quote summary (read-only) */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Quote Summary</h2>
              {!isDone && (
                <Link href={estimationPath} className="text-xs text-blue-600 hover:underline font-semibold">
                  Manage →
                </Link>
              )}
            </div>

            {deal.quotes.length === 0 ? (
              <p className="text-sm text-gray-400">No quotes yet. <Link href={estimationPath} className="text-blue-600 hover:underline">Create one →</Link></p>
            ) : (
              <div className="space-y-2">
                {acceptedQuote && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-green-700">✓ Accepted — Quote v{acceptedQuote.version}</span>
                      <span className="text-sm font-black text-green-800">{fmtMoney(acceptedQuote.total)}</span>
                    </div>
                  </div>
                )}
                {!acceptedQuote && latestQuote && (
                  <div className="border border-gray-100 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Latest — Quote v{latestQuote.version}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${latestQuote.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {latestQuote.status}
                        </span>
                        <span className="text-sm font-bold text-gray-700">{fmtMoney(latestQuote.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400">{deal.quotes.length} quote{deal.quotes.length !== 1 ? 's' : ''} total</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
