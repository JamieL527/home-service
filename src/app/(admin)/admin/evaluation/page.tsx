import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { LeadActionButtons } from '@/components/admin/lead-action-buttons'
import { NeedsFixButton } from '@/components/admin/needs-fix-button'
import { Bell, Phone } from 'lucide-react'

const NEW_STATUSES = ['NEW_LEAD', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_FIX', 'RESUBMITTED'] as never[]
const QUEUE_STATUSES = [...NEW_STATUSES, 'BACKED' as never, 'URGENT' as never, 'SCHEDULED' as never]

const PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'MLS']

const PHASE_LABEL_MAP: Record<string, string> = {
  P0: 'Phase 0',
  P1: 'Phase 1',
  P2: 'Phase 2',
  P3: 'Phase 3',
  P4: 'Phase 4',
  P5: 'Phase 5',
  MLS: 'MLS: Renovation',
}

const PHASE_FULL_NAMES: Record<string, string> = {
  P0: 'Phase 0: Survey',
  P1: 'Phase 1: Foundation',
  P2: 'Phase 2: Framing',
  P3: 'Phase 3: Mechanical',
  P4: 'Phase 4: Drywall',
  P5: 'Phase 5: Finish',
  MLS: 'MLS: Renovation',
}

// Per-phase color tokens for filter tabs
const PHASE_TAB_COLORS: Record<string, { inactive: string; active: string }> = {
  P0:  { inactive: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-200',   active: 'bg-blue-500 text-white border-blue-500' },
  P1:  { inactive: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-200',           active: 'bg-sky-500 text-white border-sky-500' },
  P2:  { inactive: 'bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-200',       active: 'bg-puple-500 text-white border-puple-500' },
  P3:  { inactive: 'bg-red-50 text-red-800 border-red-300 hover:bg-red-200',           active: 'bg-red-500 text-white border-red-500' },
  P4:  { inactive: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-200', active: 'bg-orange-600 text-white border-orange-600' },
  P5:  { inactive: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-200',       active: 'bg-amber-600 text-white border-amber-600' },
  MLS: { inactive: 'bg-green-50 text-green-800 border-green-300 hover:bg-green-200',   active: 'bg-green-600 text-white border-green-600' },
}

function groupByPhase<T extends { phase: string | null }>(leads: T[]) {
  const groups: Array<{ phase: string | null; label: string; items: T[] }> = []
  for (const p of PHASES) {
    const items = leads.filter((l) => l.phase === p)
    if (items.length > 0) groups.push({ phase: p, label: PHASE_FULL_NAMES[p] ?? p, items })
  }
  const noPhase = leads.filter((l) => !l.phase || !PHASES.includes(l.phase))
  if (noPhase.length > 0) groups.push({ phase: null, label: 'No Phase', items: noPhase })
  return groups
}

export default async function EvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string }>
}) {
  const { phase } = await searchParams

  const [allQueueLeads, allUsers] = await Promise.all([
    prisma.lead.findMany({
      where: { status: { in: QUEUE_STATUSES } },
      orderBy: { createdAt: 'desc' },
      include: { contacts: true },
    }),
    prisma.user.findMany({ select: { id: true, firstName: true, lastName: true, email: true } }),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]))

  // Per-phase counts for filter tabs
  const phaseCountMap: Record<string, { total: number; urgent: number }> = {}
  for (const lead of allQueueLeads) {
    const p = lead.phase || '(No Phase)'
    if (!phaseCountMap[p]) phaseCountMap[p] = { total: 0, urgent: 0 }
    phaseCountMap[p].total++
    if (lead.status === 'URGENT') phaseCountMap[p].urgent++
  }

  const phaseFilter = phase || null
  const displayed = phaseFilter
    ? allQueueLeads.filter((l) => l.phase === phaseFilter)
    : allQueueLeads

  const urgentLeads = displayed.filter((l) => l.status === 'URGENT')
  const backedLeads = displayed.filter((l) => l.status === 'BACKED')
  const newLeads = displayed.filter((l) => NEW_STATUSES.includes(l.status as never))

  const totalCount = allQueueLeads.length
  const newLeadCount = allQueueLeads.filter((l) => NEW_STATUSES.includes(l.status as never)).length
  const backedCount = allQueueLeads.filter((l) => l.status === 'BACKED').length
  const urgentCount = allQueueLeads.filter((l) => l.status === 'URGENT').length

  const backedGroups = groupByPhase(backedLeads)
  const newGroups = groupByPhase(newLeads)

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Evaluation & Sorting</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and triage incoming leads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Backed</p>
          <p className="text-3xl font-black text-orange-600">{backedCount}</p>
          <p className="text-xs text-orange-400 mt-0.5">Needs re-evaluation</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">New</p>
          <p className="text-3xl font-black text-green-700">{newLeadCount}</p>
          <p className="text-xs text-green-500 mt-0.5">New Intake</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Urgent</p>
          <p className="text-3xl font-black text-red-700">{urgentCount}</p>
          <p className="text-xs text-red-400 mt-0.5">Immediate action required</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Total Leads</p>
          <p className="text-3xl font-black text-blue-900">{totalCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">in evaluation queue</p>
        </div>
      </div>

      {/* Phase filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <Link
          href="/admin/evaluation"
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            !phaseFilter
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
          }`}
        >
          All ({totalCount})
        </Link>
        {PHASES.map((p) => {
          const { total = 0, urgent = 0 } = phaseCountMap[p] || {}
          const isActive = phaseFilter === p
          const colors = PHASE_TAB_COLORS[p]

          let tabCls: string
          if (isActive) {
            tabCls = colors.active
          } else if (urgent > 0) {
            // urgent overrides phase color with red tint, but keeps phase color for border
            tabCls = `bg-red-50 text-red-700 border-red-300 hover:bg-red-100`
          } else {
            tabCls = colors.inactive
          }

          return (
            <Link
              key={p}
              href={`/admin/evaluation?phase=${encodeURIComponent(p)}`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${tabCls}`}
            >
              {PHASE_LABEL_MAP[p]} ({total})
              {urgent > 0 && !isActive && (
                <span className="ml-1 text-[9px] bg-red-500 text-white rounded-full px-1 py-0.5">
                  {urgent}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Action Queue — Urgent */}
      {urgentLeads.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-300 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100 border-b border-amber-200">
            <Bell size={13} className="text-red-600" />
            <span className="text-xs font-black uppercase tracking-wider text-red-700">
              URGENT — Needs Immediate Action
            </span>
            <span className="ml-auto text-[11px] font-bold text-amber-700 bg-red-200 rounded-full px-2 py-0.5">
              {urgentLeads.length}
            </span>
          </div>
          <div className="bg-red-50 p-3 space-y-2">
            {urgentLeads.map((lead) => {
              const contact = lead.contacts[0]
              return (
                <div key={lead.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
                  {lead.phase && (
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">
                      {PHASE_FULL_NAMES[lead.phase] ?? lead.phase}
                    </p>
                  )}
                  <p className="text-sm font-black text-gray-900">{lead.address}</p>
                  {lead.businessName && (
                    <p className="text-xs text-gray-500 mt-0.5 mb-2">{lead.businessName}</p>
                  )}
                  {lead.initialComment && (
                    <div className="flex items-start gap-1.5 mb-2 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                      <span className="text-amber-500 text-xs shrink-0">⚠</span>
                      <p className="text-xs text-amber-800 leading-snug">{lead.initialComment}</p>
                    </div>
                  )}
                  {contact && (
                    <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
                      <Phone size={11} className="text-gray-400 shrink-0" />
                      <span>{contact.name}{contact.phone && ` · ${contact.phone}`}</span>
                    </div>
                  )}
                  <LeadActionButtons
                    leadId={lead.id}
                    variant="evaluation-urgent"
                    leadPhase={lead.phase}
                    detailHref={`/admin/leads/${lead.id}`}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-4">

        {/* ── Backed Leads ── */}
        <div className="rounded-xl border border-orange-300 overflow-hidden shadow-sm flex flex-col">
          {/* Header inside the box */}
          <div className="flex items-center justify-between px-4 py-3 bg-orange-200 border-b border-orange-300 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-600" />
              <span className="text-sm font-black text-orange-950">Needs Attention</span>
              <span className="text-xs text-orange-700 font-medium">(Backed Leads)</span>
            </div>
            <span className="text-sm font-black text-orange-800 bg-orange-300 rounded-full px-2.5 py-0.5">
              {backedLeads.length}
            </span>
          </div>

          {backedLeads.length === 0 ? (
            <div className="bg-orange-50 flex-1 py-12 text-center">
              <p className="text-xs text-gray-400">No backed leads</p>
            </div>
          ) : (
            <div className="bg-orange-50 flex-1 p-3 space-y-3">
              {backedGroups.map((group) => (
                <div key={group.phase ?? 'none'}>
                  <p className="text-[11px] font-black text-orange-700 uppercase tracking-wide px-1 mb-2">
                    {group.label} ({group.items.length})
                  </p>
                  <div className="space-y-2">
                    {group.items.map((lead) => {
                      const contact = lead.contacts[0]
                      const u = lead.createdById ? userMap[lead.createdById] : null
                      const collectorName = u
                        ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
                        : null
                      return (
                        <div key={lead.id} className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm">
                          {lead.phase && (
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-1">
                              {PHASE_FULL_NAMES[lead.phase] ?? lead.phase}
                            </p>
                          )}
                          <p className="text-sm font-black text-gray-900">{lead.address}</p>
                          {lead.businessName && (
                            <p className="text-xs text-gray-500 mt-0.5 mb-2">{lead.businessName}</p>
                          )}
                          {lead.initialComment && (
                            <div className="flex items-start gap-1.5 mb-2 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
                              <span className="text-orange-500 text-xs shrink-0">⚠</span>
                              <p className="text-xs text-orange-800 leading-snug">{lead.initialComment}</p>
                            </div>
                          )}
                          {collectorName && (
                            <p className="text-[11px] text-gray-400 mb-1.5">Collected by: {collectorName}</p>
                          )}
                          {contact && (
                            <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
                              <Phone size={11} className="text-gray-400 shrink-0" />
                              <span className="truncate">
                                {contact.name}{contact.phone && ` · ${contact.phone}`}
                              </span>
                            </div>
                          )}
                          <LeadActionButtons
                            leadId={lead.id}
                            variant="evaluation-backed"
                            leadPhase={lead.phase}
                            detailHref={`/admin/leads/${lead.id}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── New Leads ── */}
        <div className="rounded-xl border border-green-200 overflow-hidden shadow-sm flex flex-col">
          {/* Header inside the box */}
          <div className="flex items-center justify-between px-4 py-3 bg-green-100 border-b border-green-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm font-black text-green-900">New Leads</span>
            </div>
            <span className="text-sm font-black text-green-700 bg-green-200 rounded-full px-2.5 py-0.5">
              {newLeads.length}
            </span>
          </div>

          {newLeads.length === 0 ? (
            <div className="bg-green-50 flex-1 py-12 text-center">
              <p className="text-xs text-gray-400">No new leads</p>
            </div>
          ) : (
            <div className="bg-green-50 flex-1 p-3 space-y-3">
              {newGroups.map((group) => (
                <div key={group.phase ?? 'none'}>
                  <p className="text-[11px] font-black text-green-700 uppercase tracking-wide px-1 mb-2">
                    {group.label} ({group.items.length})
                  </p>
                  <div className="space-y-2">
                    {group.items.map((lead) => {
                      const contact = lead.contacts[0]
                      const u = lead.createdById ? userMap[lead.createdById] : null
                      const collectorName = u
                        ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
                        : null
                      const isNeedsFix = lead.status === 'NEEDS_FIX'
                      const isResubmitted = lead.status === 'RESUBMITTED'
                      return (
                        <div
                          key={lead.id}
                          className={`rounded-xl p-4 shadow-sm border ${
                            isNeedsFix
                              ? 'bg-orange-50 border-orange-300'
                              : isResubmitted
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-green-200'
                          }`}
                        >
                          {/* Status badge row */}
                          {(isNeedsFix || isResubmitted) && (
                            <div className="flex items-center gap-1.5 mb-2">
                              {isNeedsFix && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-500 text-white uppercase tracking-wide">
                                  ⚠ Needs Fix
                                </span>
                              )}
                              {isResubmitted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white uppercase tracking-wide">
                                  ✓ Resubmitted
                                </span>
                              )}
                            </div>
                          )}

                          {lead.phase && (
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-wider mb-1">
                              {PHASE_FULL_NAMES[lead.phase] ?? lead.phase}
                            </p>
                          )}
                          <p className="text-sm font-black text-gray-900">{lead.address}</p>
                          {lead.businessName && (
                            <p className="text-xs text-gray-500 mt-0.5 mb-2">{lead.businessName}</p>
                          )}

                          {/* Review comment — shown for both NEEDS_FIX and RESUBMITTED */}
                          {lead.reviewComment && (
                            <div className={`flex items-start gap-1.5 mb-2 rounded-lg px-2.5 py-2 ${
                              isNeedsFix
                                ? 'bg-orange-100 border border-orange-200'
                                : 'bg-blue-100 border border-blue-200'
                            }`}>
                              <span className={`text-xs shrink-0 ${isNeedsFix ? 'text-orange-500' : 'text-blue-500'}`}>
                                {isNeedsFix ? '⚠' : '↩'}
                              </span>
                              <div>
                                <p className={`text-[10px] font-black uppercase tracking-wide mb-0.5 ${
                                  isNeedsFix ? 'text-orange-600' : 'text-blue-600'
                                }`}>
                                  {isNeedsFix ? 'Issues to fix:' : 'Previously flagged:'}
                                </p>
                                <p className={`text-xs leading-snug ${isNeedsFix ? 'text-orange-800' : 'text-blue-800'}`}>
                                  {lead.reviewComment}
                                </p>
                              </div>
                            </div>
                          )}

                          {collectorName && (
                            <p className="text-[11px] text-gray-400 mb-1.5">Collected by: {collectorName}</p>
                          )}
                          {contact && (
                            <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-500">
                              <Phone size={11} className="text-gray-400 shrink-0" />
                              <span className="truncate">
                                {contact.name}{contact.phone && ` · ${contact.phone}`}
                              </span>
                            </div>
                          )}

                          {/* Actions: NEEDS_FIX only shows Details + update comment; others get full buttons */}
                          <div className="flex flex-wrap gap-1.5">
                            {isNeedsFix ? (
                              <>
                                <Link
                                  href={`/admin/leads/${lead.id}`}
                                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
                                >
                                  Details
                                </Link>
                                <NeedsFixButton leadId={lead.id} />
                              </>
                            ) : (
                              <>
                                <LeadActionButtons
                                  leadId={lead.id}
                                  variant="evaluation-new"
                                  leadPhase={lead.phase}
                                  detailHref={`/admin/leads/${lead.id}`}
                                />
                                <NeedsFixButton leadId={lead.id} />
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
