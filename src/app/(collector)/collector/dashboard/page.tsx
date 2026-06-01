export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import { Plus, MapPin, AlertTriangle, FileEdit, Route, CheckCircle } from 'lucide-react'
import { completeRouteTask } from '@/app/actions/route-tasks'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  QUALIFIED: 'Qualified',
  NEEDS_FIX: 'Needs Fix',
  RESUBMITTED: 'Resubmitted',
  REJECTED: 'Rejected',
  CONVERTED: 'Converted',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-green-100 text-green-700',
  NEEDS_FIX: 'bg-red-100 text-red-700',
  RESUBMITTED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-purple-100 text-purple-700',
}

export default async function CollectorDashboardPage() {
  const { user } = await requireCollectorUser()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [total, needsFixCount, leads, todayCount, draftLeads, needsFixLeads, myRoutes] = await Promise.all([
    prisma.lead.count({ where: { createdById: user.id } }),
    prisma.lead.count({ where: { createdById: user.id, status: 'NEEDS_FIX' as never } }),
    prisma.lead.findMany({ where: { createdById: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.lead.count({ where: { createdById: user.id, createdAt: { gte: todayStart } } }),
    prisma.lead.findMany({ where: { createdById: user.id, status: 'DRAFT' as never }, orderBy: { updatedAt: 'desc' } }),
    prisma.lead.findMany({ where: { createdById: user.id, status: 'NEEDS_FIX' as never }, orderBy: { updatedAt: 'desc' } }),
    prisma.routeTask.findMany({
      where: { assignedToId: user.id },
      include: {
        _count: { select: { leads: { where: { createdById: user.id } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const draftCount = draftLeads.length
  const latestDraft = draftLeads[0]
  const recentLeads = leads.slice(0, 5)


  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Field Command</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your lead collection workspace</p>
          {user.zones.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {user.zones.map(z => (
                <div key={z.id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
                  <MapPin size={11} />
                  {z.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <Link
          href="/collector/leads/new"
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">New Lead</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Today</p>
          <p className="text-3xl font-black text-gray-900">{todayCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 mb-1">Total</p>
          <p className="text-3xl font-black text-gray-900">{total}</p>
        </div>
        <a href="#section-drafts" className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm hover:brightness-95 transition-all">
          <p className="text-xs font-medium text-amber-600 mb-1">Drafts</p>
          <p className="text-3xl font-black text-amber-700">{draftCount}</p>
        </a>
        <a href="#section-fix" className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm hover:brightness-95 transition-all">
          <p className="text-xs font-medium text-red-500 mb-1">Needs Fix</p>
          <p className="text-3xl font-black text-red-700">{needsFixCount}</p>
        </a>
      </div>

      {/* Continue Draft card */}
      {draftCount > 0 && latestDraft && (
        <div id="section-drafts" className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3 min-w-0">
            <FileEdit size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black text-amber-900">
                {draftCount} unfinished draft{draftCount > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-600 mt-0.5 truncate">{latestDraft.address}</p>
            </div>
          </div>
          <Link
            href={`/collector/leads/${latestDraft.id}`}
            className="shrink-0 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors whitespace-nowrap"
          >
            Continue
          </Link>
        </div>
      )}

      {/* Needs Fix cards */}
      {needsFixLeads.length > 0 && (
        <div id="section-fix" className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-500" />
            <p className="text-sm font-black text-red-800">
              {needsFixLeads.length} lead{needsFixLeads.length > 1 ? 's' : ''} need attention
            </p>
          </div>
          <div className="space-y-2">
            {needsFixLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-red-100 px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle size={12} className="text-red-400 shrink-0" />
                  <p className="text-xs font-semibold text-gray-800 truncate">{lead.address}</p>
                </div>
                <Link
                  href={`/collector/leads/${lead.id}`}
                  className="shrink-0 px-3 py-1.5 bg-red-500 text-white text-[11px] font-bold rounded-lg hover:bg-red-600 transition-colors whitespace-nowrap"
                >
                  Fix Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Route Tasks */}
      {myRoutes.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Route size={15} className="text-purple-500" />
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Route Tasks</span>
          </div>
          <div className="space-y-2">
            {myRoutes.map((task) => {
              const leadCount = task._count.leads
              const isAssigned = task.status === 'assigned'
              const isInProgress = task.status === 'in_progress'
              const isDone = task.status === 'completed'

              return (
                <div
                  key={task.id}
                  className={`rounded-xl px-4 py-3 border ${
                    isAssigned   ? 'bg-purple-50 border-purple-300' :
                    isInProgress ? 'bg-blue-50 border-blue-300' :
                    isDone       ? 'bg-green-50 border-green-200 opacity-70' :
                                   'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 truncate">{task.name}</p>
                        {isAssigned   && <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">Assigned</span>}
                        {isInProgress && <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">In Progress</span>}
                        {isDone       && <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-600 text-white">Completed ✓</span>}
                      </div>
                      {(isAssigned || isInProgress || isDone) && leadCount > 0 && (
                        <p className="text-xs font-semibold text-blue-600 mt-0.5">
                          {leadCount} lead{leadCount !== 1 ? 's' : ''} submitted
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {/* View Map */}
                      {(isAssigned || isInProgress) && (
                        <Link
                          href={`/collector/routes/${task.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                        >
                          <MapPin size={11} />
                          View Map
                        </Link>
                      )}

                      {/* In Progress: Mark Done */}
                      {isInProgress && (
                        <form action={completeRouteTask.bind(null, task.id)}>
                          <button
                            type="submit"
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                          >
                            <CheckCircle size={11} />
                            Done
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent leads */}
      {leads.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin size={28} className="text-blue-400" />
          </div>
          <p className="font-bold text-gray-700 mb-1">No leads yet</p>
          <p className="text-sm text-gray-400 mb-5">Start collecting data in the field.</p>
          <Link
            href="/collector/leads/new"
            className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-colors shadow-md"
          >
            <Plus size={15} />
            Add Your First Lead
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Leads</span>
            <Link href="/collector/leads" className="text-xs text-blue-600 hover:underline font-medium">
              View all →
            </Link>
          </div>

          <div className="sm:hidden divide-y divide-gray-100">
            {recentLeads.map((lead) => (
              <Link
                key={lead.id}
                href={`/collector/leads/${lead.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {(lead.status as string) === 'NEEDS_FIX' && (
                      <AlertTriangle size={12} className="text-red-500 shrink-0" />
                    )}
                    <p className="text-sm font-semibold text-gray-900 truncate">{lead.address}</p>
                  </div>
                  <p className="text-xs text-gray-400">{lead.createdAt.toLocaleDateString('en-CA')}</p>
                </div>
                <span className={`shrink-0 ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[lead.status as string] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[lead.status as string] ?? lead.status}
                </span>
              </Link>
            ))}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900 max-w-[240px]">
                      <div className="flex items-center gap-1.5">
                        {(lead.status as string) === 'NEEDS_FIX' && (
                          <AlertTriangle size={12} className="text-red-500 shrink-0" />
                        )}
                        <span className="truncate">{lead.address}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{lead.zoneName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[lead.status as string] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[lead.status as string] ?? lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{lead.createdAt.toLocaleDateString('en-CA')}</td>
                    <td className="px-4 py-3">
                      <Link href={`/collector/leads/${lead.id}`} className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
