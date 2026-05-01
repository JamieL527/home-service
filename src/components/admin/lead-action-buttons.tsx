'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  injectLead, parkLead, markLeadUrgent, backLead,
  unParkLead, reEvaluateLead, moveLeadPhase,
} from '@/app/actions/leads-admin'

type Variant = 'evaluation-new' | 'evaluation-backed' | 'evaluation-urgent' | 'parking' | 'parking-inject' | 'parking-board'

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

export function LeadActionButtons({
  leadId,
  variant,
  leadPhase,
  detailHref,
}: {
  leadId: string
  variant: Variant
  leadPhase?: string | null
  detailHref?: string
}) {
  const [pending, startTransition] = useTransition()
  const [injected, setInjected] = useState(false)
  const router = useRouter()

  function act(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  function handleInject(phase?: string) {
    startTransition(async () => {
      await injectLead(leadId, phase)
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
      onClick={() => handleInject(phase)}
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
    <p className="text-[11px] font-semibold text-green-600">
      ✓ Lead injected to Marketing Inbox
    </p>
  )

  if (variant === 'evaluation-new') return (
    <div className="flex gap-1.5 flex-wrap">
      {injectBtn('bg-blue-600 text-white hover:bg-blue-700', nextPhase)}
      {btn('Back Lead', 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', () => backLead(leadId))}
      {btn('Send to Parking', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () => parkLead(leadId))}
      {btn('Mark Urgent', 'bg-red-100 text-red-700 hover:bg-red-200', () => markLeadUrgent(leadId))}
      {detailBtn}
    </div>
  )

  if (variant === 'evaluation-backed') return (
    <div className="flex gap-1.5 flex-wrap">
      {btn('Re-evaluate', 'bg-amber-100 text-amber-700 hover:bg-amber-200', () => reEvaluateLead(leadId))}
      {btn('Send to Parking', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () => parkLead(leadId))}
      {detailBtn}
    </div>
  )

  if (variant === 'evaluation-urgent') return (
    <div className="flex gap-1.5 flex-wrap">
      {injectBtn('bg-green-600 text-white hover:bg-green-700', nextPhase)}
      {btn('Send to Parking', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () => parkLead(leadId))}
      {btn('De-escalate', 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', () => backLead(leadId))}
      {detailBtn}
    </div>
  )

  if (variant === 'parking') return (
    <div className="flex gap-1.5 flex-wrap">
      {injectBtn('bg-green-600 text-white hover:bg-green-700', nextPhase)}
      {btn('Restore', 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200', () => unParkLead(leadId))}
      {detailBtn}
    </div>
  )

  if (variant === 'parking-inject') return (
    <div className="flex gap-1.5 flex-wrap">
      {btn('Inject Now', 'bg-blue-600 text-white hover:bg-blue-700', () => injectLead(leadId, leadPhase ?? undefined))}
      {detailBtn}
    </div>
  )

  if (variant === 'parking-board') return (
    <div className="flex gap-1 flex-wrap">
      {btn('Inject Now', 'bg-blue-600 text-white hover:bg-blue-700', () => injectLead(leadId, leadPhase ?? undefined))}
      {btn('Move Phase', 'bg-slate-100 text-slate-600 hover:bg-slate-200', () => moveLeadPhase(leadId, nextPhase))}
    </div>
  )

  return null
}
