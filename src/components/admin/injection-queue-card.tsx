'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, X, Calendar } from 'lucide-react'
import {
  injectLead, scheduleLeadInjection, cancelLeadSchedule, moveLeadPhase,
} from '@/app/actions/leads-admin'

const PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'MLS']
const PHASE_FULL_NAMES: Record<string, string> = {
  P0: 'Phase 0: Survey', P1: 'Phase 1: Foundation', P2: 'Phase 2: Framing',
  P3: 'Phase 3: Mechanical', P4: 'Phase 4: Drywall', P5: 'Phase 5: Finish',
  MLS: 'MLS: Renovation',
}

function daysUntil(isoDate: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(isoDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export type InjectionLeadData = {
  id: string
  address: string
  businessName: string | null
  phase: string | null
  initialComment: string | null
  scheduledInjectAt: string | null
  contacts: Array<{ id: string; name: string | null; phone: string | null }>
}

export function InjectionQueueCard({ lead }: { lead: InjectionLeadData }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPhasePicker, setShowPhasePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => { setMounted(true) }, [])

  const isScheduled = !!(lead.scheduledInjectAt && new Date(lead.scheduledInjectAt) > new Date())
  const days = lead.scheduledInjectAt ? daysUntil(lead.scheduledInjectAt) : null
  const contact = lead.contacts[0]

  function act(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); router.refresh() })
  }

  const actionBtn = (label: string, color: string, onClick: () => void, disabled = false) => (
    <button
      disabled={disabled || pending}
      onClick={onClick}
      className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap ${color}`}
    >
      {label}
    </button>
  )

  return (
    <div className="p-4">
      {lead.phase && (
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
          {PHASE_FULL_NAMES[lead.phase] ?? lead.phase}
        </p>
      )}
      <p className="text-sm font-black text-gray-900 mb-0.5">{lead.address}</p>
      {lead.businessName && (
        <p className="text-xs text-gray-500 mb-2">{lead.businessName}</p>
      )}
      {lead.initialComment && (
        <div className="mb-2 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
          <p className="text-[11px] text-amber-800 leading-snug line-clamp-2">{lead.initialComment}</p>
        </div>
      )}
      {isScheduled && lead.scheduledInjectAt && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-orange-600 font-semibold">
          <Calendar size={11} />
          <span>{new Date(lead.scheduledInjectAt).toLocaleDateString('en-CA')}</span>
        </div>
      )}
      {contact && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
          <Phone size={11} className="text-gray-400" />
          <span>{contact.name}{contact.phone && ` (${contact.phone})`}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {isScheduled ? (
          <>
            <span className="px-2.5 py-1.5 bg-orange-100 text-orange-700 text-[11px] font-bold rounded-lg whitespace-nowrap border border-orange-200">
              Inject in {days} day{days !== 1 ? 's' : ''}
            </span>
            {actionBtn('Inject Now', 'bg-blue-600 text-white hover:bg-blue-700', () => act(() => injectLead(lead.id, lead.phase ?? undefined)))}
            {actionBtn('Cancel', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () => act(() => cancelLeadSchedule(lead.id)))}
          </>
        ) : (
          <>
            {actionBtn('Inject Now', 'bg-blue-600 text-white hover:bg-blue-700', () => act(() => injectLead(lead.id, lead.phase ?? undefined)))}
            {actionBtn('Schedule', 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200', () => setShowDatePicker(true))}
          </>
        )}
        {actionBtn('Move Phase', 'bg-gray-100 text-gray-600 hover:bg-gray-200', () => setShowPhasePicker(true))}
        <Link
          href={`/admin/leads/${lead.id}`}
          className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Details
        </Link>
      </div>

      {/* Date Picker Modal */}
      {mounted && showDatePicker && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-80">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-black text-gray-900">Schedule Injection</h3>
              <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4 truncate">{lead.address}</p>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Injection Date
            </label>
            <input
              type="date"
              min={getTomorrow()}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDatePicker(false); setSelectedDate('') }}
                className="flex-1 px-3 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedDate || pending}
                onClick={() => {
                  if (selectedDate) {
                    act(() => scheduleLeadInjection(lead.id, new Date(selectedDate + 'T12:00:00')))
                    setShowDatePicker(false)
                    setSelectedDate('')
                  }
                }}
                className="flex-1 px-3 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Phase Picker Modal */}
      {mounted && showPhasePicker && createPortal(
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-72">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-black text-gray-900">Move to Phase</h3>
              <button onClick={() => setShowPhasePicker(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4 truncate">{lead.address}</p>
            <div className="grid grid-cols-1 gap-1.5">
              {PHASES.map((p) => (
                <button
                  key={p}
                  disabled={pending || lead.phase === p}
                  onClick={() => { act(() => moveLeadPhase(lead.id, p)); setShowPhasePicker(false) }}
                  className={`px-3 py-2 text-xs font-bold rounded-lg border text-left transition-colors disabled:opacity-50 ${
                    lead.phase === p
                      ? 'bg-blue-600 text-white border-blue-600 cursor-default'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {lead.phase === p && '✓ '}{PHASE_FULL_NAMES[p] ?? p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPhasePicker(false)}
              className="w-full mt-3 px-3 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
