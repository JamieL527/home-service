import { ContractorSidebarNav } from '@/components/contractor/sidebar-nav'
import { ContractorBottomNav } from '@/components/contractor/bottom-nav'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { requireContractorUser } from '@/lib/contractor'
import { prisma } from '@/lib/prisma'

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const { company, email } = await requireContractorUser()

  const [regularOfferCount, referralOfferCount] = await Promise.all([
    prisma.jobOffer.count({
      where: {
        companyId: company.id,
        status: 'pending',
        job: {
          status: { in: ['PENDING', 'READY', 'OFFER_SENT'] as never[] },
          lead: { source: { not: 'referral' } },
        },
      },
    }),
    // Only count referral OFFER_SENT jobs where the contractor hasn't started a quote yet
    // (matches classifyReferralJob: hasDraft → 'active', hasSubmitted → 'completed', else → 'offers')
    prisma.job.count({
      where: {
        companyId: company.id,
        status: { in: ['OFFER_SENT'] as never[] },
        lead: {
          source: 'referral',
          deals: { none: { quotes: { some: {} } } },
        },
      },
    }),
  ])
  const offerCount = regularOfferCount + referralOfferCount
  const registrationLabel = company.registrationType === 'referral' ? 'Referral Network' : 'Direct Outreach & Q.C.'

  return (
    <div className="flex min-h-screen bg-[#f4f6fb]">
      {/* Desktop sidebar */}
      <aside
        className="hidden sm:flex sm:w-[248px] sm:shrink-0 sm:flex-col sticky top-0 h-screen bg-[#0f1830] text-[#cbd5e1]"
        style={{ padding: '20px 14px', gap: '4px' }}
      >
        {/* Brand block */}
        <div className="flex items-center" style={{ gap: 11, padding: '6px 8px 18px' }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 11,
              background: 'rgba(255,255,255,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 34 34" fill="none">
              <rect x="2" y="2" width="30" height="30" rx="8" fill="rgba(255,255,255,.1)" />
              <line x1="10" y1="10" x2="17" y2="17" stroke="#7dd3fc" strokeWidth="1.6" />
              <line x1="24" y1="10" x2="17" y2="17" stroke="#fcd34d" strokeWidth="1.6" />
              <line x1="10" y1="24" x2="17" y2="17" stroke="#7dd3fc" strokeWidth="1.6" />
              <line x1="24" y1="24" x2="17" y2="17" stroke="#fcd34d" strokeWidth="1.6" />
              <circle cx="10" cy="10" r="2.6" fill="#7dd3fc" />
              <circle cx="24" cy="10" r="2.6" fill="#fcd34d" />
              <circle cx="10" cy="24" r="2.6" fill="#7dd3fc" />
              <circle cx="24" cy="24" r="2.6" fill="#fcd34d" />
              <circle cx="17" cy="17" r="3.6" fill="#fff" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#fff', fontSize: 15, lineHeight: 1.1 }}>
              Construction Market
            </div>
            <span style={{ display: 'block', fontWeight: 500, fontSize: 11, color: '#94a3b8' }}>
              Contractor Account
            </span>
          </div>
        </div>

        {/* Nav items */}
        <ContractorSidebarNav offerCount={offerCount} />

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            borderTop: '1px solid rgba(255,255,255,.1)',
            paddingTop: 14,
            fontSize: '12.5px',
            color: '#94a3b8',
            paddingLeft: 8,
          }}
        >
          {company.name || 'My Company'}
          <br />
          <span style={{ opacity: 0.7 }}>{registrationLabel} · Active</span>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 sm:px-6">
          <span className="sm:hidden text-sm font-bold text-[#0f1830] truncate flex-1 mr-4">
            {company.name}
          </span>
          <div className="ml-auto">
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-20 sm:px-[30px] sm:pt-[30px] sm:pb-[70px]">
          <div className="max-w-[1080px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      <ContractorBottomNav />
    </div>
  )
}
