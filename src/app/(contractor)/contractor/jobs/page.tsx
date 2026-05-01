import Link from 'next/link'
import { requireContractorUser } from '@/lib/contractor'
import { prisma } from '@/lib/prisma'
import { OfferActions } from './offer-actions'

const PHASE_LABELS: Record<string, string> = {
  P0: 'Phase 0', P1: 'Phase 1', P2: 'Phase 2',
  P3: 'Phase 3', P4: 'Phase 4', P5: 'Phase 5', MLS: 'MLS',
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  ASSIGNED:    { label: 'Assigned',    color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  COMPLETED:   { label: 'Completed',   color: 'bg-green-100 text-green-700' },
  VERIFIED:    { label: 'Verified',    color: 'bg-emerald-100 text-emerald-700' },
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

// Only show city/region for privacy — e.g. "123 Main St, Toronto, ON" → "Toronto, ON"
function maskAddress(address: string): string {
  const parts = address.split(',').map((s) => s.trim())
  if (parts.length >= 3) return `${parts[1]}, ${parts[2].replace(/\s+\S+$/, '').trim()}`
  if (parts.length >= 2) return parts[1]
  return 'Location withheld'
}

type Tab = 'offers' | 'active' | 'completed'

export default async function ContractorJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { company } = await requireContractorUser()
  const { tab: rawTab } = await searchParams
  const tab: Tab = rawTab === 'active' ? 'active' : rawTab === 'completed' ? 'completed' : 'offers'

  const [offerCount, activeCount, completedCount] = await Promise.all([
    prisma.jobOffer.count({ where: { companyId: company.id, status: 'pending' } }),
    prisma.job.count({
      where: { companyId: company.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] as never[] } },
    }),
    prisma.job.count({
      where: { companyId: company.id, status: { in: ['COMPLETED', 'VERIFIED'] as never[] } },
    }),
  ])

  const pendingOffers = tab === 'offers'
    ? await prisma.jobOffer.findMany({
        where: { companyId: company.id, status: 'pending' },
        include: {
          job: {
            include: { lead: { select: { address: true } } },
          },
        },
        orderBy: { sentAt: 'desc' },
      })
    : []

  const activeJobs = tab === 'active'
    ? await prisma.job.findMany({
        where: { companyId: company.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] as never[] } },
        include: { lead: { select: { address: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const completedJobs = tab === 'completed'
    ? await prisma.job.findMany({
        where: { companyId: company.id, status: { in: ['COMPLETED', 'VERIFIED'] as never[] } },
        include: { lead: { select: { address: true } } },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'offers',    label: 'New Offers', count: offerCount },
    { key: 'active',    label: 'Active',     count: activeCount },
    { key: 'completed', label: 'Completed',  count: completedCount },
  ]

  return (
    <div className="animate-fadeIn">
      <h1 className="text-2xl font-bold text-foreground mb-6">Jobs</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-600">New Offers</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{offerCount}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-medium text-green-600">Active Jobs</p>
          <p className="mt-2 text-3xl font-bold text-green-700">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="mt-2 text-3xl font-bold text-gray-600">{completedCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-border">
        {tabs.map(({ key, label, count }) => (
          <Link
            key={key}
            href={`/contractor/jobs?tab=${key}`}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1.5 text-xs font-bold rounded-full px-1.5 py-0.5 ${
                tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* New Offers */}
      {tab === 'offers' && (
        pendingOffers.length === 0 ? (
          <EmptyState message="No new offers at the moment." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pendingOffers.map((offer) => {
              const job = offer.job
              const phase = job.phase
              const price = formatPrice(job)
              return (
                <div key={offer.id} className="rounded-xl border border-blue-200 bg-blue-50/40 p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">New Offer</p>
                      <p className="text-sm font-bold text-foreground">{maskAddress(job.lead.address)}</p>
                    </div>
                    {phase && (
                      <span className="shrink-0 text-[10px] font-bold bg-white border border-blue-200 text-blue-600 rounded-full px-2 py-0.5">
                        {PHASE_LABELS[phase] ?? phase}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {job.serviceType && (
                      <p><span className="font-medium text-foreground">Service:</span> {job.serviceType}</p>
                    )}
                    {job.scope && (
                      <p className="line-clamp-2"><span className="font-medium text-foreground">Scope:</span> {job.scope}</p>
                    )}
                    {price && (
                      <p><span className="font-medium text-foreground">Price:</span> {price}</p>
                    )}
                    {job.timeline && (
                      <p><span className="font-medium text-foreground">Timeline:</span> {job.timeline}</p>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground mt-3">
                    Received {offer.sentAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>

                  <OfferActions offerId={offer.id} />
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Active Jobs */}
      {tab === 'active' && (
        activeJobs.length === 0 ? (
          <EmptyState message="No active jobs." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeJobs.map((job) => {
              const meta = STATUS_META[job.status as string]
              const price = formatPrice(job)
              return (
                <Link
                  key={job.id}
                  href={`/contractor/jobs/${job.id}`}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors block"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-sm font-bold text-foreground leading-snug">{job.lead.address}</p>
                    {meta && (
                      <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${meta.color}`}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {job.serviceType && <p>{job.serviceType}</p>}
                    {price && <p>{price}</p>}
                    {job.timeline && <p>{job.timeline}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}

      {/* Completed Jobs */}
      {tab === 'completed' && (
        completedJobs.length === 0 ? (
          <EmptyState message="No completed jobs yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {completedJobs.map((job) => {
              const meta = STATUS_META[job.status as string]
              const price = formatPrice(job)
              return (
                <Link
                  key={job.id}
                  href={`/contractor/jobs/${job.id}`}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors block"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-sm font-bold text-foreground leading-snug">{job.lead.address}</p>
                    {meta && (
                      <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 ${meta.color}`}>
                        {meta.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {job.serviceType && <p>{job.serviceType}</p>}
                    {price && <p>{price}</p>}
                    {job.timeline && <p>{job.timeline}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-12 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
