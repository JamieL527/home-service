export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { requireContractorUser } from '@/lib/contractor'
import { prisma } from '@/lib/prisma'
import { Briefcase, CheckCircle, Users, Bell } from 'lucide-react'

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0', P1: 'Phase 1', P2: 'Phase 2',
  P3: 'Phase 3', P4: 'Phase 4', P5: 'Phase 5', MLS: 'MLS',
}

function maskAddress(address: string): string {
  const parts = address.split(',').map((s) => s.trim())
  if (parts.length >= 3) return `${parts[1]}, ${parts[2].replace(/\s+\S+$/, '').trim()}`
  if (parts.length >= 2) return parts[1]
  return 'Location withheld'
}

function formatPrice(job: {
  priceType: string | null; priceFixed: number | null
  priceMin: number | null; priceMax: number | null
}) {
  if (!job.priceType) return null
  if (job.priceType === 'fixed' && job.priceFixed != null)
    return `$${job.priceFixed.toLocaleString()}`
  if (job.priceType === 'range' && job.priceMin != null && job.priceMax != null)
    return `$${job.priceMin.toLocaleString()} – $${job.priceMax.toLocaleString()}`
  return null
}

export default async function ContractorOverviewPage() {
  const { company } = await requireContractorUser()

  const [memberCount, offerCount, activeCount, completedCount, pendingOffers] = await Promise.all([
    prisma.user.count({ where: { contractorCompanyId: company.id } }),
    prisma.jobOffer.count({ where: { companyId: company.id, status: 'pending' } }),
    prisma.job.count({
      where: { companyId: company.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] as never[] } },
    }),
    prisma.job.count({
      where: { companyId: company.id, status: { in: ['COMPLETED', 'VERIFIED'] as never[] } },
    }),
    prisma.jobOffer.findMany({
      where: { companyId: company.id, status: 'pending' },
      include: { job: { include: { lead: { select: { address: true } } } } },
      orderBy: { sentAt: 'desc' },
      take: 5,
    }),
  ])

  return (
    <div className="animate-fadeIn">
      <h1 className="text-2xl font-bold text-foreground mb-6">Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link
          href="/contractor/jobs?tab=offers"
          className="rounded-xl border border-blue-200 bg-blue-50 p-5 hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Bell size={15} className="text-blue-500" />
            <p className="text-sm font-medium text-blue-600">New Offers</p>
          </div>
          <p className="text-3xl font-bold text-blue-700">{offerCount}</p>
        </Link>

        <Link
          href="/contractor/jobs?tab=active"
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Briefcase size={15} className="text-amber-600" />
            <p className="text-sm font-medium text-amber-700">Active Jobs</p>
          </div>
          <p className="text-3xl font-bold text-amber-700">{activeCount}</p>
        </Link>

        <Link
          href="/contractor/jobs?tab=completed"
          className="rounded-xl border border-green-200 bg-green-50 p-5 hover:bg-green-100 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={15} className="text-green-600" />
            <p className="text-sm font-medium text-green-700">Completed</p>
          </div>
          <p className="text-3xl font-bold text-green-700">{completedCount}</p>
        </Link>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users size={15} className="text-gray-500" />
            <p className="text-sm font-medium text-gray-600">Team Members</p>
          </div>
          <p className="text-3xl font-bold text-gray-700">{memberCount}</p>
        </div>
      </div>

      {/* Pending offers preview */}
      {pendingOffers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Pending Offers
            </h2>
            <Link
              href="/contractor/jobs?tab=offers"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {pendingOffers.map((offer) => {
              const job = offer.job
              const price = formatPrice(job)
              return (
                <Link
                  key={offer.id}
                  href="/contractor/jobs?tab=offers"
                  className="block rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-blue-900 truncate">
                        {maskAddress(job.lead.address)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {job.phase && (
                          <span className="text-xs text-blue-600 font-medium">
                            {PHASE_LABELS[job.phase] ?? job.phase}
                          </span>
                        )}
                        {job.serviceType && (
                          <span className="text-xs text-blue-500">{job.serviceType}</span>
                        )}
                        {price && (
                          <span className="text-xs font-bold text-blue-700">{price}</span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold bg-blue-600 text-white px-2 py-1 rounded-full">
                      New
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {offerCount === 0 && activeCount === 0 && completedCount === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <p className="text-2xl mb-3">🎉</p>
          <h2 className="text-base font-bold text-foreground mb-2">Welcome to Construction Market</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Your account is active. Leads will appear here as we sweep your service area — you&apos;ll receive job offers when opportunities match your trade type and location.
          </p>
        </div>
      )}
    </div>
  )
}
