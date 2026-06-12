export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Briefcase } from 'lucide-react'
import { NewReferralLeadButton } from './new-referral-lead-button'
import { DeleteReferralJobButton } from './delete-referral-job-button'

const PHASES = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'MLS']

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0', P1: 'Phase 1', P2: 'Phase 2',
  P3: 'Phase 3', P4: 'Phase 4', P5: 'Phase 5', MLS: 'MLS',
}

const PHASE_TAB_COLORS: Record<string, { inactive: string; active: string }> = {
  P0:  { inactive: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-200',     active: 'bg-blue-500 text-white border-blue-500' },
  P1:  { inactive: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-200',         active: 'bg-sky-500 text-white border-sky-500' },
  P2:  { inactive: 'bg-purple-50 text-purple-600 border-purple-300 hover:bg-purple-200', active: 'bg-purple-500 text-white border-purple-500' },
  P3:  { inactive: 'bg-red-50 text-red-800 border-red-300 hover:bg-red-200',         active: 'bg-red-500 text-white border-red-500' },
  P4:  { inactive: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-200', active: 'bg-orange-600 text-white border-orange-600' },
  P5:  { inactive: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-200', active: 'bg-amber-600 text-white border-amber-600' },
  MLS: { inactive: 'bg-green-50 text-green-800 border-green-300 hover:bg-green-200', active: 'bg-green-600 text-white border-green-600' },
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  PENDING:     { label: 'Pending',     color: 'bg-gray-100 text-gray-600 border-gray-200',        dot: 'bg-gray-400' },
  READY:       { label: 'Ready',       color: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-500' },
  OFFER_SENT:  { label: 'Offer Sent',  color: 'bg-purple-50 text-purple-700 border-purple-200',   dot: 'bg-purple-500' },
  ASSIGNED:    { label: 'Assigned',    color: 'bg-green-50 text-green-700 border-green-200',      dot: 'bg-green-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500' },
  COMPLETED:   { label: 'Completed',   color: 'bg-teal-50 text-teal-700 border-teal-200',         dot: 'bg-teal-500' },
  VERIFIED:    { label: 'Verified',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-red-50 text-red-600 border-red-200',            dot: 'bg-red-400' },
}

function formatPrice(job: {
  priceType: string | null
  priceFixed: number | null
  priceMin: number | null
  priceMax: number | null
}) {
  if (!job.priceType) return null
  if (job.priceType === 'fixed' && job.priceFixed != null) return `$${job.priceFixed.toLocaleString()}`
  if (job.priceType === 'range' && job.priceMin != null && job.priceMax != null)
    return `$${job.priceMin.toLocaleString()} – $${job.priceMax.toLocaleString()}`
  return null
}

export default async function JobBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ phase?: string; status?: string }>
}) {
  const { phase: phaseFilter, status: statusFilter } = await searchParams

  const where: Record<string, unknown> = {}
  if (phaseFilter) where.phase = phaseFilter
  if (statusFilter) where.status = statusFilter

  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lead: { select: { id: true, address: true, phase: true, source: true, deals: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true } } } },
      company: { select: { name: true } },
    },
  })

  const [allJobs, staffUsers] = await Promise.all([
    prisma.job.findMany({
      select: { status: true, phase: true, lead: { select: { phase: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: ['SALES', 'ADMIN'] as never[] } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: 'asc' },
    }),
  ])

  const counts = {
    PENDING:     allJobs.filter(j => j.status === 'PENDING' as never).length,
    READY:       allJobs.filter(j => j.status === 'READY' as never).length,
    OFFER_SENT:  allJobs.filter(j => j.status === 'OFFER_SENT' as never).length,
    ASSIGNED:    allJobs.filter(j => j.status === 'ASSIGNED' as never).length,
    IN_PROGRESS: allJobs.filter(j => j.status === 'IN_PROGRESS' as never).length,
    COMPLETED:   allJobs.filter(j => j.status === 'COMPLETED' as never).length,
    VERIFIED:    allJobs.filter(j => j.status === 'VERIFIED' as never).length,
    total:       allJobs.length,
  }

  const phaseCountMap: Record<string, number> = {}
  for (const j of allJobs) {
    const p = j.phase ?? j.lead.phase ?? '(none)'
    phaseCountMap[p] = (phaseCountMap[p] || 0) + 1
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage jobs from injection to completion</p>
        </div>
        <NewReferralLeadButton staffUsers={staffUsers} />
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {([
          ['PENDING',     'Pending',     'bg-gray-50 border-gray-200 text-gray-700',       'hover:bg-gray-100'],
          ['READY',       'Ready',       'bg-blue-50 border-blue-200 text-blue-700',        'hover:bg-blue-100'],
          ['OFFER_SENT',  'Offer Sent',  'bg-purple-50 border-purple-200 text-purple-700',  'hover:bg-purple-100'],
          ['ASSIGNED',    'Assigned',    'bg-green-50 border-green-200 text-green-700',     'hover:bg-green-100'],
          ['IN_PROGRESS', 'In Progress', 'bg-amber-50 border-amber-200 text-amber-700',     'hover:bg-amber-100'],
          ['COMPLETED',   'Completed',   'bg-teal-50 border-teal-200 text-teal-700',        'hover:bg-teal-100'],
          ['VERIFIED',    'Verified',    'bg-emerald-50 border-emerald-200 text-emerald-700', 'hover:bg-emerald-100'],
        ] as const).map(([key, label, cls, hover]) => {
          const isActive = statusFilter === key
          return (
            <Link
              key={key}
              href={isActive ? '/admin/jobs' : `/admin/jobs?status=${key}`}
              className={`flex items-center gap-2 border rounded-xl px-4 py-3 shadow-sm transition-colors ${cls} ${isActive ? 'ring-2 ring-offset-1 ring-current' : hover}`}
            >
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}:</span>
              <span className="text-2xl font-black">{counts[key]}</span>
            </Link>
          )
        })}
        <Link
          href="/admin/jobs"
          className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-slate-50 border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:bg-slate-100 transition-colors"
        >
          <Briefcase size={14} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total:</span>
          <span className="text-2xl font-black text-slate-700">{counts.total}</span>
        </Link>
      </div>

      {/* Phase Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <Link
          href="/admin/jobs"
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
            !phaseFilter
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
          }`}
        >
          All ({allJobs.length})
        </Link>
        {PHASES.map((p) => {
          const count = phaseCountMap[p] || 0
          const isActive = phaseFilter === p
          const colors = PHASE_TAB_COLORS[p]
          return (
            <Link
              key={p}
              href={`/admin/jobs?phase=${encodeURIComponent(p)}`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                isActive ? colors.active : colors.inactive
              }`}
            >
              {PHASE_LABELS[p]} ({count})
            </Link>
          )
        })}
      </div>

      {/* Job List */}
      {jobs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
          <Briefcase size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No jobs yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {jobs.map((job) => {
            const meta = STATUS_META[job.status as string] ?? STATUS_META.PENDING
            const price = formatPrice(job)

            return (
              <div key={job.id} className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-start sm:gap-4">

                {/* Top row on mobile: dot + address + badges */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-1.5 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <p className="text-sm font-black text-gray-900 truncate">{job.lead.address}</p>
                      {(job.phase ?? job.lead.phase) && (
                        <span className="text-[10px] font-black bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 whitespace-nowrap">
                          {PHASE_LABELS[job.phase ?? job.lead.phase ?? ''] ?? (job.phase ?? job.lead.phase)}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold border rounded-full px-2 py-0.5 whitespace-nowrap ${meta.color}`}>
                        {meta.label}
                      </span>
                      {job.lead.source === 'referral' && (
                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 whitespace-nowrap">
                          Referral
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      {job.serviceType && <span>Service: <span className="font-medium text-gray-700">{job.serviceType}</span></span>}
                      {price && <span>Price: <span className="font-medium text-gray-700">{price}</span></span>}
                      {job.timeline && <span>Timeline: <span className="font-medium text-gray-700">{job.timeline}</span></span>}
                      {job.company && (
                        <span>Contractor: <span className="font-medium text-gray-700">{job.company.name}</span></span>
                      )}
                    </div>
                    {job.scope && (
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{job.scope}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap mt-3 sm:mt-0 sm:shrink-0 sm:flex-nowrap">
                  {(job.status as string) === 'PENDING' && (
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      Fill Details
                    </Link>
                  )}
                  {(job.status as string) === 'READY' && (
                    <>
                      {job.lead.deals[0]?.id && (
                        <Link
                          href={`/admin/sales/deals/${job.lead.deals[0].id}/estimation`}
                          className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                        >
                          Plans & Quote
                        </Link>
                      )}
                      <Link
                        href={`/admin/jobs/${job.id}/match`}
                        className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-green-600 text-white text-[11px] font-bold rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                      >
                        Find Contractor
                      </Link>
                      {job.lead.source === 'referral' && (
                        <>
                          <Link
                            href={`/admin/jobs/${job.id}`}
                            className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-white border border-gray-200 text-gray-600 text-[11px] font-bold rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                          >
                            Edit
                          </Link>
                          <DeleteReferralJobButton jobId={job.id} />
                        </>
                      )}
                    </>
                  )}
                  {(job.status as string) === 'OFFER_SENT' && (
                    <>
                      {job.lead.deals[0]?.id && (
                        <Link
                          href={`/admin/sales/deals/${job.lead.deals[0].id}/estimation`}
                          className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                        >
                          Plans & Quote
                        </Link>
                      )}
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                      >
                        View Offer
                      </Link>
                    </>
                  )}
                  {(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED'] as const).includes(job.status as never) && (
                    <>
                      {job.lead.deals[0]?.id && (
                        <Link
                          href={`/admin/sales/deals/${job.lead.deals[0].id}/estimation`}
                          className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                        >
                          Plans & Quote
                        </Link>
                      )}
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                      >
                        View Details
                      </Link>
                    </>
                  )}
                  <Link
                    href={`/admin/leads/${job.lead.id}?from=jobs`}
                    className="flex-1 sm:flex-none text-center px-3 py-2 sm:py-1.5 bg-white border border-gray-200 text-gray-500 text-[11px] font-bold rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    Lead Detail
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
