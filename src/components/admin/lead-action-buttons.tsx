'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import {
  injectLead, parkLead, markLeadUrgent, backLead,
  unParkLead, reEvaluateLead, moveLeadPhase, closeLead,
} from '@/app/actions/leads-admin'

type Variant = 'evaluation-new' | 'evaluation-backed' | 'evaluation-urgent' | 'parking' | 'parking-inject' | 'parking-board'
export type MarketingUser = { id: string; name: string }

const PHASE_ORDER = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'MLS']
const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0', P1: 'Phase 1', P2: 'Phase 2',
  P3: 'Phase 3', P4: 'Phase 4', P5: 'Phase 5', MLS: 'MLS',
}

function getNextPhase(current: string | null | undefined): string {
  if (!current) return 'P1'
  const idx = PHASE_ORDER.indexOf(current)
  if (idx === -1) return 'P1'
  return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length]
}

function AssignModal({
  onSelect,
  onClose,
  marketingUsers,
  address,
}: {
  onSelect: (userId: string | undefined) => void
  onClose: () => void
  marketingUsers: MarketingUser[]
  address?: string
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 shadow-2xl w-72">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-black text-gray-900">Assign to Marketing</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        {address && <p className="text-xs text-gray-400 mb-4 truncate">{address}</p>}
        <div className="space-y-1.5 mb-3">
          {marketingUsers.map(u => (
            <button
              key={u.id}
              onClick={() => onSelect(u.id)}
              className="w-full px-3 py-2 text-sm font-semibold text-left rounded-lg bg-gray-50 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              {u.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => onSelect(undefined)}
          className="w-full px-3 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Inject without assigning
        </button>
      </div>
    </div>
  )
}

export function LeadActionButtons({
  leadId,
  variant,
  leadPhase,
  detailHref,
  marketingUsers = [],
  leadAddress,
}: {
  leadId: string
  variant: Variant
  leadPhase?: string | null
  detailHref?: string
  marketingUsers?: MarketingUser[]
  leadAddress?: string
}) {
  const [pending, startTransition] = useTransition()
  const [injected, setInjected] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [pendingPhase, setPendingPhase] = useState<string | undefined>()
  const router = useRouter()

  function act(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  function triggerInject(phase?: string) {
    if (marketingUsers.length > 0) {
      setPendingPhase(phase)
      setShowAssign(true)
    } else {
      handleInject(phase, undefined)
    }
  }

  function handleInject(phase?: string, assignedId?: string) {
    setShowAssign(false)
    startTransition(async () => {
      await injectLead(leadId, phase, assignedId)
      setInjected(true)
      setTimeout(() => router.refresh(), 1500)
    })
  }

  const nextPhase = getNextPhase(leadPhase)
  const nextPhaseLabel = PHASE_LABELS[nextPhase] ?? nextPhase

  const btn = (label: string, color: string, fn: () => Promise<void>) => (
    <button
      disabled={pending}
      onClick={() => act(fn)}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 active:scale-95 whitespace-nowrap ${color}`}
    >
      {label}
    </button>
  )

  const injectBtn = (color: string, phase?: string) => (
    <button
      disabled={pending}
      onClick={() => triggerInject(phase)}
      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 active:scale-95 whitespace-nowrap ${color}`}
    >
      {pending ? '…' : `Inject to ${nextPhaseLabel}`}
    </button>
  )

  const detailBtn = detailHref ? (
    <Link
      href={detailHref}
      className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
    >
      Details
    </Link>
  ) : null

  if (injected) return (
    <p className="text-[11px] font-semibold text-green-600">✓ Lead injected to Marketing Inbox</p>
  )

  return (
    <>
      {showAssign && (
        <AssignModal
          marketingUsers={marketingUsers}
          address={leadAddress}
          onClose={() => setShowAssign(false)}
          onSelect={(uid) => handleInject(pendingPhase, uid)}
        />
      )}

      {variant === 'evaluation-new' && (
        <div className="flex gap-1.5 flex-wrap">
          {injectBtn('bg-blue-600 text-white hover:bg-blue-700', nextPhase)}
          {btn('Back Lead', 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', () => backLead(leadId))}
          {btn('Send to Parking', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () => parkLead(leadId))}
          {btn('Mark Urgent', 'bg-red-100 text-red-700 hover:bg-red-200', () => markLeadUrgent(leadId))}
          {detailBtn}
        </div>
      )}

      {variant === 'evaluation-backed' && (
        <div className="flex gap-1.5 flex-wrap">
          {btn('Re-evaluate', 'bg-amber-100 text-amber-700 hover:bg-amber-200', () => reEvaluateLead(leadId))}
          {btn('Send to Parking', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () => parkLead(leadId))}
          {detailBtn}
        </div>
      )}

      {variant === 'evaluation-urgent' && (
        <div className="flex gap-1.5 flex-wrap">
          {injectBtn('bg-green-600 text-white hover:bg-green-700', nextPhase)}
          {btn('Send to Parking', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () => parkLead(leadId))}
          {btn('De-escalate', 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', () => backLead(leadId))}
          {detailBtn}
        </div>
      )}

      {variant === 'parking' && (
        <div className="flex gap-1.5 flex-wrap">
          {injectBtn('bg-green-600 text-white hover:bg-green-700', nextPhase)}
          {btn('Restore', 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', () => unParkLead(leadId))}
          {detailBtn}
        </div>
      )}

      {variant === 'parking-inject' && (
        <div className="flex gap-1.5 flex-wrap">
          {btn('Inject Now', 'bg-blue-600 text-white hover:bg-blue-700', () => injectLead(leadId, leadPhase ?? undefined))}
          {detailBtn}
        </div>
      )}

      {variant === 'parking-board' && (
        <div className="flex gap-1 flex-wrap">
          <button
            disabled={pending}
            onClick={() => triggerInject(leadPhase ?? undefined)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 active:scale-95 whitespace-nowrap transition-all"
          >
            Inject Now
          </button>
          {btn('Move Phase', 'bg-slate-100 text-slate-600 hover:bg-slate-200', () => moveLeadPhase(leadId, nextPhase))}
          {btn('Return to Evaluation', 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100', () => unParkLead(leadId))}
          {btn('Close Lead', 'bg-red-50 text-red-500 hover:bg-red-100', async () => {
            if (!confirm('Close this lead? It will be removed from all active lists.')) return
            await closeLead(leadId)
          })}
        </div>
      )}
    </>
  )
}
