export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { requireContractorUser } from '@/lib/contractor'
import { prisma } from '@/lib/prisma'
import { OfferActions } from './offer-actions'
import { QuoteDownloadButton } from './quote-download-button'

function dealQuoteNo(dealId: string, version: number): string {
  let h = 0
  for (let i = 0; i < dealId.length; i++) {
    h = Math.imul(31, h) + dealId.charCodeAt(i) | 0
  }
  const base = (Math.abs(h) % 900000) + 100000
  return `Q-${base}-V${version}`
}

const fmtMoney = (n: number | null) =>
  n == null ? '—' : '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

  // Fetch all referral OFFER_SENT jobs with their latest quote status for classification
  const allReferralOfferJobs = await prisma.job.findMany({
    where: {
      companyId: company.id,
      status: { in: ['OFFER_SENT'] as never[] },
      lead: { source: 'referral' },
    },
    include: {
      lead: {
        select: {
          address: true,
          source: true,
          phase: true,
          deals: {
            take: 1,
            select: {
              id: true,
              quotes: {
                orderBy: { version: 'desc' as never },
                take: 5,
                select: {
                  id: true,
                  status: true,
                  version: true,
                  subtotal: true,
                  total: true,
                  pdfUrl: true,
                  submittedAt: true,
                  lineItems: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  function classifyReferralJob(job: typeof allReferralOfferJobs[number]) {
    const quotes = job.lead.deals[0]?.quotes ?? []
    const hasDraft = quotes.some(q => q.status === 'draft')
    const hasSubmitted = quotes.some(q => ['pending_review', 'submitted', 'accepted'].includes(q.status))
    if (hasDraft) return 'active'
    if (hasSubmitted) return 'completed'
    return 'offers'
  }

  const referralByTab = {
    offers: allReferralOfferJobs.filter(j => classifyReferralJob(j) === 'offers'),
    active: allReferralOfferJobs.filter(j => classifyReferralJob(j) === 'active'),
    completed: allReferralOfferJobs.filter(j => classifyReferralJob(j) === 'completed'),
  }

  const [regularOfferCount, regularActiveCount, regularCompletedCount] = await Promise.all([
    prisma.jobOffer.count({
      where: {
        companyId: company.id,
        status: 'pending',
        job: { status: { in: ['PENDING', 'READY', 'OFFER_SENT'] as never[] }, lead: { source: { not: 'referral' } } },
      },
    }),
    prisma.job.count({
      where: { companyId: company.id, status: { in: ['ASSIGNED', 'IN_PROGRESS'] as never[] } },
    }),
    prisma.job.count({
      where: { companyId: company.id, status: { in: ['COMPLETED', 'VERIFIED'] as never[] } },
    }),
  ])

  const offerCount = regularOfferCount + referralByTab.offers.length
  const activeCount = regularActiveCount + referralByTab.active.length
  const completedCount = regularCompletedCount + referralByTab.completed.length

  const pendingOffers = tab === 'offers'
    ? await prisma.jobOffer.findMany({
        where: {
          companyId: company.id,
          status: 'pending',
          job: { status: { in: ['PENDING', 'READY', 'OFFER_SENT'] as never[] }, lead: { source: { not: 'referral' } } },
        },
        include: {
          job: {
            include: { lead: { select: { address: true, source: true } } },
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
      <h1 className="text-[28px] font-extrabold tracking-[-0.02em] mb-[22px]">Jobs</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Link href="/contractor/jobs?tab=offers" className="rounded-[14px] border border-[#dbe6ff] bg-[#eff4ff] py-[18px] px-5 hover:brightness-[0.97] transition-all">
          <p className="text-sm font-bold text-[#2563eb]">New Offers</p>
          <p className="mt-1 text-[32px] font-extrabold text-[#1d4ed8] leading-none">{offerCount}</p>
        </Link>
        <Link href="/contractor/jobs?tab=active" className="rounded-[14px] border border-[#fde6cf] bg-[#fff7ed] py-[18px] px-5 hover:brightness-[0.97] transition-all">
          <p className="text-sm font-bold text-[#d97706]">Active Jobs</p>
          <p className="mt-1 text-[32px] font-extrabold text-[#b45309] leading-none">{activeCount}</p>
        </Link>
        <Link href="/contractor/jobs?tab=completed" className="rounded-[14px] border border-[#cdeccf] bg-[#f0fdf4] py-[18px] px-5 hover:brightness-[0.97] transition-all">
          <p className="text-sm font-bold text-[#16a34a]">Completed</p>
          <p className="mt-1 text-[32px] font-extrabold text-[#15803d] leading-none">{completedCount}</p>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-[26px] mb-[22px] border-b border-[#e7e8ef]">
        {tabs.map(({ key, label, count }) => (
          <Link
            key={key}
            href={`/contractor/jobs?tab=${key}`}
            className={`px-0.5 py-[10px] text-sm font-semibold border-b-2 transition-colors -mb-px ${
              tab === key
                ? 'border-[#2563eb] text-[#0f172a]'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ml-[7px] inline-flex items-center justify-center min-w-[20px] h-[20px] text-[11px] font-bold rounded-full bg-[#0f172a] text-white px-[5px]">
                {count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* New Offers */}
      {tab === 'offers' && (
        pendingOffers.length === 0 && referralByTab.offers.length === 0 ? (
          <EmptyState message="No new offers at the moment." />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Regular pending offers */}
            {pendingOffers.map((offer) => {
              const job = offer.job
              const phase = job.phase
              const price = formatPrice(job)
              return (
                <div key={offer.id} className="rounded-2xl border border-gray-200 shadow-sm bg-white p-6">
                  <div className="flex flex-wrap gap-2 mb-3.5">
                    <span className="text-[11px] font-bold tracking-[0.04em] px-[11px] py-[5px] rounded-full bg-[#eff4ff] text-[#2563eb]">
                      NEW OFFER
                    </span>
                    {phase && (
                      <span className="text-[11px] font-bold tracking-[0.04em] px-[11px] py-[5px] rounded-full bg-gray-100 text-gray-600">
                        {PHASE_LABELS[phase] ?? phase}
                      </span>
                    )}
                  </div>
                  <h2 className="text-[22px] font-extrabold text-gray-900 mb-3">{maskAddress(job.lead.address)}</h2>
                  <div className="space-y-0.5 text-sm text-slate-600 mb-4">
                    {job.serviceType && <p><b className="text-gray-900">Service:</b> {job.serviceType}</p>}
                    {job.scope && <p className="line-clamp-2"><b className="text-gray-900">Scope:</b> {job.scope}</p>}
                    {price && <p><b className="text-gray-900">Price:</b> {price}</p>}
                    {job.timeline && <p><b className="text-gray-900">Timeline:</b> {job.timeline}</p>}
                  </div>
                  <p className="text-[12.5px] text-gray-400 mb-4">
                    Received {offer.sentAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <OfferActions offerId={offer.id} />
                </div>
              )
            })}
            {/* Referral jobs with no quotes yet */}
            {referralByTab.offers.map((job) => (
              <div key={job.id} className="rounded-2xl border border-gray-200 shadow-sm bg-white p-6">
                <div className="flex flex-wrap gap-2 mb-3.5">
                  <span className="text-[11px] font-bold tracking-[0.04em] px-[11px] py-[5px] rounded-full bg-[#eff4ff] text-[#2563eb]">
                    QUOTE REQUEST
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.04em] px-[11px] py-[5px] rounded-full bg-[#f5f3ff] text-[#7c3aed]">
                    Referral
                  </span>
                </div>
                <h2 className="text-[22px] font-extrabold text-gray-900 mb-3">{job.lead.address}</h2>
                <div className="space-y-0.5 text-sm text-slate-600">
                  {job.serviceType && <p><b className="text-gray-900">Service:</b> {job.serviceType}</p>}
                  {job.scope && <p className="line-clamp-2"><b className="text-gray-900">Scope:</b> {job.scope}</p>}
                  {job.timeline && <p><b className="text-gray-900">Timeline:</b> {job.timeline}</p>}
                </div>
                <p className="mt-4 px-4 py-3.5 rounded-[10px] text-sm italic text-[#1e40af] border border-[#dbe9ff] bg-[#f0f7ff]">
                  View plans, take measurements, and submit your quote.
                </p>
                <p className="text-[12.5px] text-[#6b7280] mt-3 mb-4">
                  Received {job.createdAt.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <Link
                  href={`/contractor/jobs/${job.id}/quote`}
                  className="block w-full py-3 text-center text-sm font-bold text-white rounded-xl bg-[#2563eb] hover:bg-blue-700 transition-colors"
                >
                  View Plans &amp; Submit Quote
                </Link>
              </div>
            ))}
          </div>
        )
      )}

      {/* Active Jobs */}
      {tab === 'active' && (
        activeJobs.length === 0 && referralByTab.active.length === 0 ? (
          <EmptyState message="No active jobs." />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Regular ASSIGNED/IN_PROGRESS jobs */}
            {activeJobs.map((job) => {
              const isInProgress = job.status === 'IN_PROGRESS'
              const chipStyle = isInProgress
                ? { background: '#fff7ed', color: '#b45309' }
                : { background: '#e0f2fe', color: '#0369a1' }
              const chipLabel = isInProgress ? 'IN PROGRESS' : 'ASSIGNED'
              return (
                <Link
                  key={job.id}
                  href={`/contractor/jobs/${job.id}`}
                  className="rounded-2xl border border-gray-200 shadow-sm bg-white p-6 hover:border-blue-300 transition-colors block"
                >
                  <div className="flex flex-wrap gap-2 mb-3.5">
                    <span className="text-[11px] font-bold tracking-[0.04em] px-[11px] py-[5px] rounded-full" style={chipStyle}>
                      {chipLabel}
                    </span>
                  </div>
                  <h2 className="text-[22px] font-extrabold text-gray-900 mb-3">{job.lead.address}</h2>
                  <div className="space-y-0.5 text-sm text-slate-600 mb-4">
                    {job.serviceType && <p><b className="text-gray-900">Service:</b> {job.serviceType}</p>}
                    {job.timeline && <p><b className="text-gray-900">Timeline:</b> {job.timeline}</p>}
                  </div>
                  <div className="block w-full py-3 text-center text-sm font-bold text-white rounded-xl bg-gray-900">
                    View Job Details
                  </div>
                </Link>
              )
            })}
            {/* Referral jobs with draft quotes */}
            {referralByTab.active.map((job) => (
              <Link
                key={job.id}
                href={`/contractor/jobs/${job.id}/quote`}
                className="rounded-2xl border border-gray-200 shadow-sm bg-white p-6 hover:border-blue-300 transition-colors block"
              >
                <div className="flex flex-wrap gap-2 mb-3.5">
                  <span className="text-[11px] font-bold tracking-[0.04em] px-[11px] py-[5px] rounded-full bg-[#fff7ed] text-[#b45309]">
                    DRAFT QUOTE
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.04em] px-[11px] py-[5px] rounded-full bg-[#f5f3ff] text-[#7c3aed]">
                    Referral
                  </span>
                </div>
                <h2 className="text-[22px] font-extrabold text-gray-900 mb-3">{job.lead.address}</h2>
                <div className="space-y-0.5 text-sm text-slate-600 mb-4">
                  {job.serviceType && <p><b className="text-gray-900">Service:</b> {job.serviceType}</p>}
                  {job.timeline && <p><b className="text-gray-900">Timeline:</b> {job.timeline}</p>}
                </div>
                <p className="text-[12.5px] text-[#6b7280] mb-4">Draft saved – not submitted yet</p>
                <div className="block w-full py-3 text-center text-sm font-bold text-white rounded-xl bg-[#2563eb]">
                  Continue Quote →
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Completed Jobs */}
      {tab === 'completed' && (
        completedJobs.length === 0 && referralByTab.completed.length === 0 ? (
          <EmptyState message="No completed jobs yet." />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Regular COMPLETED/VERIFIED jobs */}
            {completedJobs.map((job) => {
              const meta = STATUS_META[job.status as string]
              return (
                <Link
                  key={job.id}
                  href={`/contractor/jobs/${job.id}`}
                  className="rounded-2xl border border-gray-200 shadow-sm bg-white p-6 hover:border-blue-300 transition-colors block"
                >
                  <div className="flex flex-wrap gap-2 mb-3.5">
                    {meta && (
                      <span className={`text-[11px] font-bold tracking-[0.04em] px-[11px] py-[5px] rounded-full ${meta.color}`}>
                        {meta.label.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h2 className="text-[22px] font-extrabold text-gray-900 mb-3">{job.lead.address}</h2>
                  <div className="space-y-0.5 text-sm text-slate-600 mb-4">
                    {job.serviceType && <p><b className="text-gray-900">Service:</b> {job.serviceType}</p>}
                    {job.timeline && <p><b className="text-gray-900">Timeline:</b> {job.timeline}</p>}
                  </div>
                  <div className="block w-full py-3 text-center text-sm font-bold rounded-xl border border-gray-200 text-gray-700">
                    View Job Details
                  </div>
                </Link>
              )
            })}
            {/* Referral jobs with submitted/accepted quotes */}
            {referralByTab.completed.map((job) => {
              const deal = job.lead.deals[0]
              const allQuotes = deal?.quotes ?? []
              const submittedQuotes = allQuotes.filter(q => ['submitted', 'pending_review', 'accepted'].includes(q.status))
              return (
                <div key={job.id} style={{ background: '#fff', border: '1px solid #e7e8ef', borderRadius: 16, boxShadow: '0 1px 2px rgba(15,23,42,.04),0 10px 30px rgba(15,23,42,.06)', padding: '22px 24px' }}>
                  {/* Job header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 12 }}>
                    <div>
                      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                        {job.lead.address.split(',')[0]}
                      </h2>
                      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
                        {job.serviceType && <span>🏷️ {job.serviceType}</span>}
                        <span>✓ Completed</span>
                        <span>{submittedQuotes.length} quote version{submittedQuotes.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <Link
                      href={`/contractor/jobs/${job.id}/quote`}
                      style={{ flexShrink: 0, background: '#f8fafc', color: '#2563eb', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 13, padding: '8px 13px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                    >
                      + New version
                    </Link>
                  </div>

                  {/* Submitted quote vcards */}
                  <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#94a3b8', margin: '16px 0 8px' }}>
                    Submitted quotes
                  </div>
                  {submittedQuotes.map(q => {
                    const items = Array.isArray(q.lineItems) ? q.lineItems as Array<{ description?: string; quantity?: number; unitPrice?: number }> : []
                    const firstItem = items[0]
                    const issueDate = q.submittedAt
                      ? new Date(q.submittedAt).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
                      : null
                    const quoteNo = deal ? dealQuoteNo(deal.id, q.version) : `V${q.version}`
                    const isAccepted = q.status === 'accepted'
                    return (
                      <div key={q.id} style={{ border: '1px solid #e7e8ef', borderRadius: 13, padding: '18px 20px', marginBottom: 12 }}>
                        {/* vh */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Quote v{q.version} · {quoteNo}</h4>
                          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', padding: '4px 10px', borderRadius: 999, background: '#dcfce7', color: '#15803d' }}>
                            {isAccepted ? 'Accepted' : 'Submitted'}
                          </span>
                        </div>
                        {/* vline */}
                        {firstItem && (
                          <div style={{ fontSize: '13.5px', color: '#334155', display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                            <span>{firstItem.description}{items.length > 1 ? ` + ${items.length - 1} more` : ''}</span>
                            <span>{fmtMoney(q.subtotal)}</span>
                          </div>
                        )}
                        {/* vtot */}
                        <div style={{ borderTop: '1px solid #e7e8ef', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                          <span>Total (incl. HST)</span>
                          <span>{fmtMoney(q.total)}</span>
                        </div>
                        {/* vfoot */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>🔒 {issueDate ? `Issued ${issueDate} · ` : ''}locked</span>
                          {q.pdfUrl && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <a href={q.pdfUrl} target="_blank" rel="noopener noreferrer"
                                style={{ background: '#fff', color: '#0f172a', border: '1px solid #e7e8ef', borderRadius: 11, fontWeight: 700, fontSize: 13, padding: '8px 13px', textDecoration: 'none' }}>
                                View
                              </a>
                              <QuoteDownloadButton pdfUrl={q.pdfUrl} filename={`${quoteNo}.pdf`} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
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
