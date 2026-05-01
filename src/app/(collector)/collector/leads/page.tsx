import Link from 'next/link'
import { requireCollectorUser } from '@/lib/collector'
import { prisma } from '@/lib/prisma'
import { Plus, MapPin, AlertTriangle } from 'lucide-react'

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

export default async function MyLeadsPage() {
  const { user } = await requireCollectorUser()

  const leads = await prisma.lead.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-start mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">My Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''} collected</p>
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

          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-gray-100">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/collector/leads/${lead.id}`}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    {(lead.status as string) === 'NEEDS_FIX' && (
                      <AlertTriangle size={12} className="text-red-500 shrink-0" />
                    )}
                    <p className="text-sm font-semibold text-gray-900 truncate">{lead.address}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {lead.businessName && (
                      <span className="text-xs text-gray-400">{lead.businessName}</span>
                    )}
                    {lead.phase && (
                      <span className="text-xs text-gray-400">{lead.phase}</span>
                    )}
                    <span className="text-xs text-gray-400">{lead.createdAt.toLocaleDateString('en-CA')}</span>
                  </div>
                </div>
                <span className={`shrink-0 ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[lead.status] ?? lead.status}
                </span>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phase</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900 max-w-[240px]">
                      <span className="truncate block">{lead.address}</span>
                      {lead.businessName && (
                        <span className="text-xs text-gray-400 font-normal">{lead.businessName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{lead.phase ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{lead.zoneName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[lead.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{lead.createdAt.toLocaleDateString('en-CA')}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/collector/leads/${lead.id}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs hover:underline whitespace-nowrap"
                      >
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
