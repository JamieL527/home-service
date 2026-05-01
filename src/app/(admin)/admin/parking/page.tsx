import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { LeadActionButtons } from '@/components/admin/lead-action-buttons'
import { InjectionQueueCard, type InjectionLeadData } from '@/components/admin/injection-queue-card'
import { Zap, ParkingSquare } from 'lucide-react'

const PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'MLS']

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0', P1: 'Phase 1', P2: 'Phase 2',
  P3: 'Phase 3', P4: 'Phase 4', P5: 'Phase 5', MLS: 'MLS: Renovation',
}

const PHASE_FULL_NAMES: Record<string, string> = {
  P0: 'Phase 0: Survey', P1: 'Phase 1', P2: 'Phase 2',
  P3: 'Phase 3', P4: 'Phase 4', P5: 'Phase 5',
  MLS: 'MLS: Renovation',
}

const PHASE_COLORS: Record<string, {
  tab: string; activeTab: string
  header: string; col: string; border: string; cardBorder: string
}> = {
  P0:  { tab: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-200',     activeTab: 'bg-blue-600 text-white border-blue-600',     header: 'bg-blue-500 text-white',   col: 'bg-blue-50',   border: 'border-blue-300',   cardBorder: 'border-blue-100' },
  P1:  { tab: 'bg-sky-50 text-sky-900 border-sky-400 hover:bg-sky-200',     activeTab: 'bg-sky-600 text-white border-sky-600',     header: 'bg-sky-500 text-white',   col: 'bg-sky-50',   border: 'border-sky-400',   cardBorder: 'border-sky-100' },
  P2:  { tab: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-200',         activeTab: 'bg-purple-500 text-white border-purple-500',       header: 'bg-purple-400 text-white',    col: 'bg-purple-50',    border: 'border-purple-300',    cardBorder: 'border-purple-100' },
  P3:  { tab: 'bg-red-50 text-red-800 border-red-300 hover:bg-red-200',         activeTab: 'bg-red-600 text-white border-red-600',       header: 'bg-red-500 text-white',    col: 'bg-red-50',    border: 'border-red-300',    cardBorder: 'border-red-100' },
  P4:  { tab: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-200', activeTab: 'bg-orange-600 text-white border-orange-600', header: 'bg-orange-500 text-white', col: 'bg-orange-50', border: 'border-orange-300', cardBorder: 'border-orange-100' },
  P5:  { tab: 'bg-amber-50 text-teal-800 border-amber-300 hover:bg-amber-200',     activeTab: 'bg-amber-600 text-white border-amber-600',     header: 'bg-amber-500 text-white',   col: 'bg-amber-50',   border: 'border-amber-300',   cardBorder: 'border-amber-100' },
  MLS: { tab: 'bg-green-50 text-green-800 border-green-300 hover:bg-green-200', activeTab: 'bg-green-600 text-white border-green-600',   header: 'bg-green-500 text-white',  col: 'bg-green-50',  border: 'border-green-300',  cardBorder: 'border-green-100' },
}

export default async function ParkingPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>
}) {
  const { phase: phaseFilter } = await searchParams

  const [parkedLeads, injectedCount] = await Promise.all([
    prisma.lead.findMany({
      where: { status: 'PARKED' as never },
      orderBy: { updatedAt: 'desc' },
      include: { contacts: true },
    }),
    prisma.lead.count({ where: { status: 'INJECTED' as never } }),
  ])

  const totalAll = parkedLeads.length
  const urgentCount = parkedLeads.filter((l) => l.isUrgent).length

  const phaseCountMap: Record<string, number> = {}
  for (const lead of parkedLeads) {
    const p = lead.phase ?? '(No Phase)'
    phaseCountMap[p] = (phaseCountMap[p] || 0) + 1
  }

  const boardsByPhase: Record<string, typeof parkedLeads> = {}
  for (const p of PHASES) {
    boardsByPhase[p] = parkedLeads.filter((l) => l.phase === p)
  }

  const now = new Date()
  const readyLeads = parkedLeads.filter(
    (l) => !l.scheduledInjectAt || l.scheduledInjectAt <= now,
  )
  const futureScheduledLeads = parkedLeads.filter(
    (l) => l.scheduledInjectAt && l.scheduledInjectAt > now,
  )

  function serializeLead(lead: (typeof parkedLeads)[0]): InjectionLeadData {
    return {
      id: lead.id,
      address: lead.address,
      businessName: lead.businessName,
      phase: lead.phase,
      initialComment: lead.initialComment,
      scheduledInjectAt: lead.scheduledInjectAt?.toISOString() ?? null,
      contacts: lead.contacts.map((c) => ({ id: c.id, name: c.name, phone: c.phone })),
    }
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Parking{' '}
          <span className="text-lg font-medium text-gray-400">(Scheduling & Injection)</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Hold, schedule, and release leads into the job pipeline</p>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-sm">
          <ParkingSquare size={14} className="text-amber-700" />
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Total:</span>
          <span className="text-2xl font-black text-amber-700">{totalAll}</span>
          <span className="text-xs text-amber-400">in Parking</span>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-blue-200 rounded-xl px-4 py-3 shadow-sm">
          <Zap size={14} className="text-blue-700" />
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Ready Today:</span>
          <span className="text-2xl font-black text-blue-700">{readyLeads.length}</span>
          <span className="text-blue-300 mx-1">|</span>
          <span className="text-xs font-bold text-orange-500 uppercase tracking-wider">Urgent:</span>
          <span className="text-sm font-black bg-orange-500 text-white rounded-full px-2 py-0.5">{urgentCount}</span>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border border-blue-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Scheduled:</span>
          <span className="text-2xl font-black text-blue-700">{futureScheduledLeads.length}</span>
          <span className="text-xs text-blue-400">→ Future Jobs</span>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Future Jobs:</span>
          <span className="text-sm font-black bg-blue-600 text-white rounded-full px-2.5 py-1">{injectedCount}</span>
        </div>
      </div>

      {/* Injection Queue */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={15} className="text-amber-500" />
          <span className="text-sm font-black text-gray-800">Injection Queue</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left: READY TODAY */}
          <div className="rounded-xl border border-blue-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-200">
              <span className="text-xs font-black uppercase tracking-wider text-blue-700">READY TODAY</span>
              <span className="ml-auto text-[10px] font-black bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                {readyLeads.length}
              </span>
            </div>
            {readyLeads.length === 0 ? (
              <div className="py-10 text-center bg-white">
                <p className="text-xs text-gray-300">No leads ready</p>
              </div>
            ) : (
              <div className="bg-white divide-y divide-gray-100">
                {readyLeads.map((lead) => (
                  <InjectionQueueCard key={lead.id} lead={serializeLead(lead)} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Scheduled */}
          <div className="rounded-xl border border-orange-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border-b border-orange-200">
              <span className="text-xs font-black uppercase tracking-wider text-orange-700">Scheduled</span>
              <span className="ml-auto text-[10px] font-black bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">
                {futureScheduledLeads.length}
              </span>
            </div>
            {futureScheduledLeads.length === 0 ? (
              <div className="py-10 text-center bg-white">
                <p className="text-xs text-gray-300">No scheduled injections</p>
              </div>
            ) : (
              <div className="bg-white divide-y divide-gray-100">
                {futureScheduledLeads.map((lead) => (
                  <InjectionQueueCard key={lead.id} lead={serializeLead(lead)} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Phase Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Link
          href="/admin/parking"
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            !phaseFilter
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
          }`}
        >
          All ({parkedLeads.length})
        </Link>
        {PHASES.map((p) => {
          const count = phaseCountMap[p] || 0
          const isActive = phaseFilter === p
          const colors = PHASE_COLORS[p]
          return (
            <Link
              key={p}
              href={`/admin/parking?phase=${encodeURIComponent(p)}`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                isActive ? colors.activeTab : colors.tab
              }`}
            >
              {PHASE_FULL_NAMES[p] ?? PHASE_LABELS[p]} ({count})
            </Link>
          )
        })}
      </div>

      {/* Phase Boards */}
      <div className="flex items-center gap-1.5 mb-3">
        <ParkingSquare size={13} className="text-gray-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Phase Boards</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:pb-4">
        {PHASES.map((p) => {
          const leads = boardsByPhase[p] ?? []
          const colors = PHASE_COLORS[p]
          return (
            <div
              key={p}
              className={`min-w-0 sm:w-[225px] sm:flex-shrink-0 rounded-xl overflow-hidden border ${colors.border} shadow-sm flex flex-col`}
            >
              <div className={`${colors.header} px-3 py-2.5 flex items-center justify-between shrink-0`}>
                <span className="text-xs font-black">{PHASE_FULL_NAMES[p] ?? PHASE_LABELS[p]}</span>
                <span className="text-[10px] font-black bg-black/20 rounded-full px-1.5 py-0.5">
                  {leads.length}
                </span>
              </div>
              <div className={`${colors.col} flex-1 p-2 space-y-2 min-h-[100px]`}>
                {leads.length === 0 ? (
                  <p className="text-center text-[11px] text-gray-300 py-6">Empty</p>
                ) : (
                  leads.map((lead) => {
                    const contact = lead.contacts[0]
                    const shortAddress = lead.address?.split(',')[0] || ''
                    return (
                      <div key={lead.id} className={`bg-white border ${colors.cardBorder} rounded-lg p-3 shadow-sm`}>
                        <p className="text-xs font-black text-gray-900 mb-0.5 truncate">{shortAddress}</p>
                        {lead.businessName && (
                          <p className="text-[10px] text-gray-500 mb-1.5 truncate">{lead.businessName}</p>
                        )}
                        {lead.initialComment && (
                          <div className="mb-2 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                            <p className="text-[10px] text-amber-700 leading-snug line-clamp-2">{lead.initialComment}</p>
                          </div>
                        )}
                        {contact && (
                          <div className="mb-1">
                            <p className="text-[10px] text-gray-600 font-medium truncate">{contact.name}</p>
                            {contact.phone && (
                              <p className="text-[10px] text-gray-400">{contact.phone}</p>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mb-2">
                          Updated: {lead.updatedAt.toLocaleDateString('en-CA')}
                        </p>
                        <LeadActionButtons
                          leadId={lead.id}
                          variant="parking-board"
                          leadPhase={lead.phase}
                          detailHref={`/admin/leads/${lead.id}`}
                        />
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
