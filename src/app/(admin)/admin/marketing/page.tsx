import { prisma } from '@/lib/prisma'
import { InboxBoard } from '@/components/marketing/inbox-board'

const MARKETING_STATUSES = ['MARKETING_INBOX', 'CONTACTING', 'NO_RESPONSE', 'CONTACT_ESTABLISHED'] as never[]

export default async function AdminMarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'inbox' } = await searchParams

  const allLeads = await prisma.lead.findMany({
    where: { status: { in: MARKETING_STATUSES } },
    include: { contacts: true },
    orderBy: { updatedAt: 'asc' },
  })

  const newCount         = allLeads.filter(l => l.marketingTag === 'NEW').length
  const reactivatedCount = allLeads.filter(l => l.marketingTag === 'RE-ACTIVATED').length
  const errorCount       = allLeads.filter(l => l.marketingTag === 'FIXED').length

  return (
    <InboxBoard
      tab={tab}
      allLeads={allLeads}
      newCount={newCount}
      reactivatedCount={reactivatedCount}
      errorCount={errorCount}
    />
  )
}
