import Link from 'next/link'
import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import { Plus, MapPin, AlertTriangle, FileEdit } from 'lucide-react'

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

  const [total, submitted, underReview, needsFixCount, leads, todayCount, draftLeads, needsFixLeads] = await Promise.all([
    prisma.lead.count({ where: { createdById: user.id } }),
    prisma.lead.count({ where: { createdById: user.id, status: 'SUBMITTED' as never } }),
    prisma.lead.count({ where: { createdById: user.id, status: 'UNDER_REVIEW' as never } }),
    prisma.lead.count({ where: { createdById: user.id, status: 'NEEDS_FIX' as never } }),
    prisma.lead.findMany({ where: { createdById: user.id }, orderBy: { createdAt: 'desc' } }),
    prisma.lead.count({ where: { createdById: user.id, createdAt: { gte: todayStart } } }),
    prisma.lead.findMany({
      where: { createdById: user.id, status: 'DRAFT' as never },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.lead.findMany({
      where: { createdById: user.id, status: 'NEEDS_FIX' as never },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const draftCount = draftLeads.length
  const latestDraft = draftLeads[0]
  const recentLeads = leads.slice(0, 5)

  const stats = [
    { label: 'Total Leads',  value: total,        valueCls: 'text-gray-900',  cardCls: 'bg-white border-gray-200' },
    { label: 'Submitted',    value: submitted,     valueCls: 'text-blue-700',  cardCls: 'bg-blue-50 border-blue-100' },
    { label: 'Under Review', value: underReview,   valueCls: 'text-yellow-700', cardCls: 'bg-yellow-50 border-yellow-100' },
    { label: 'Needs Fix',    value: needsFixCount, valueCls: 'text-red-700',   cardCls: 'bg-red-50 border-red-100' },
  ]

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Field Command</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your lead collection workspace</p>
          {user.zone && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
              <MapPin size={11} />
              {user.zone.name}
            </div>
          )}
        </div>
        <Link
          href="/collector/leads/new"
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={15} />
          New Lead
        </Link>
      </div>

      {/* Today's quick stats */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today:</span>
          <span className="text-xl font-black text-gray-900">{todayCount}</span>
          <span className="text-xs text-gray-400">collected</span>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 shadow-sm">
          <FileEdit size={13} className="text-amber-600" />
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Drafts:</span>
          <span className="text-xl font-black text-amber-700">{draftCount}</span>
        </div>
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 shadow-sm">
          <AlertTriangle size={13} className="text-red-500" />
          <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Needs Fix:</span>
          <span className="text-xl font-black text-red-700">{needsFixCount}</span>
        </div>
      </div>

      {/* Continue Draft card */}
      {draftCount > 0 && latestDraft && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3 min-w-0">
            <FileEdit size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black text-amber-900">
                You have {draftCount} unfinished draft{draftCount > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-600 mt-0.5 truncate">{latestDraft.address}</p>
            </div>
          </div>
          <Link
            href={`/collector/leads/${latestDraft.id}`}
            className="shrink-0 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-colors whitespace-nowrap"
          >
            Continue Draft
          </Link>
        </div>
      )}

      {/* Needs Fix cards */}
      {needsFixLeads.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-red-500" />
            <p className="text-sm font-black text-red-800">
              {needsFixLeads.length} lead{needsFixLeads.length > 1 ? 's' : ''} need{needsFixLeads.length === 1 ? 's' : ''} your attention
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

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`${s.cardCls} border rounded-xl p-4 shadow-sm`}>
            <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.valueCls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Lead list */}
      {leads.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-14 text-center shadow-sm">
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
            <Link href="/collector/leads" className="text-xs text-blue-600 hover:underline">
              View all leads
            </Link>
          </div>
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
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-[200px]">
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
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {lead.createdAt.toLocaleDateString('en-CA')}
                  </td>
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
      )}
    </div>
  )
}
