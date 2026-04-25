import Link from 'next/link'
import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import { buttonVariants } from '@/components/ui/button'
import { Plus, MapPin } from 'lucide-react'

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
  NEEDS_FIX: 'bg-orange-100 text-orange-700',
  RESUBMITTED: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-red-100 text-red-700',
  CONVERTED: 'bg-purple-100 text-purple-700',
}

export default async function CollectorDashboardPage() {
  const { user } = await requireCollectorUser()

  const [total, submitted, underReview, qualified, leads] = await Promise.all([
    prisma.lead.count({ where: { createdById: user.id } }),
    prisma.lead.count({ where: { createdById: user.id, status: 'SUBMITTED' as never } }),
    prisma.lead.count({ where: { createdById: user.id, status: 'UNDER_REVIEW' as never } }),
    prisma.lead.count({ where: { createdById: user.id, status: 'QUALIFIED' as never } }),
    prisma.lead.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const stats = [
    { label: 'Total Leads', value: total, valueCls: 'text-gray-900', cardCls: 'bg-white border-gray-200' },
    { label: 'Submitted', value: submitted, valueCls: 'text-blue-700', cardCls: 'bg-blue-50 border-blue-100' },
    { label: 'Under Review', value: underReview, valueCls: 'text-yellow-700', cardCls: 'bg-yellow-50 border-yellow-100' },
    { label: 'Qualified', value: qualified, valueCls: 'text-green-700', cardCls: 'bg-green-50 border-green-100' },
  ]

  const RECENT_LIMIT = 5
  const recentLeads = leads.slice(0, RECENT_LIMIT)

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Field Command</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your lead collection workspace</p>
        </div>
        <Link
          href="/collector/leads/new"
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-[0_4px_12px_rgba(37,99,235,0.3)] hover:bg-blue-700 active:scale-95 transition-all"
        >
          <Plus size={15} />
          New Lead
        </Link>
      </div>

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
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Recent Leads
            </span>

            <Link
              href="/collector/leads"
              className="text-xs text-blue-600 hover:underline"
            >
              View all leads
            </Link>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>

            <tbody>
              {recentLeads.map((lead, i) => (
                <tr
                  key={lead.id}
                  className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                    i % 2 === 0 ? '' : 'bg-gray-50/40'
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-[220px] truncate">
                    {lead.address}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        STATUS_COLORS[lead.status] ??
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_LABELS[lead.status] ?? lead.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {lead.createdAt.toLocaleDateString('en-CA')}
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      href={`/collector/leads/${lead.id}`}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline"
                    >
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