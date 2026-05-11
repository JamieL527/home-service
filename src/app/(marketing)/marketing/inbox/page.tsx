export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { InboxBoard } from '@/components/marketing/inbox-board'

const MARKETING_STATUSES = ['MARKETING_INBOX', 'CONTACTING', 'NO_RESPONSE', 'CONTACT_ESTABLISHED'] as never[]

export default async function MarketingInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'inbox' } = await searchParams

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const currentUser = authUser
    ? await prisma.user.findFirst({ where: { email: { equals: authUser.email!, mode: 'insensitive' } } })
    : null

  const allLeads = await prisma.lead.findMany({
    where: { status: { in: MARKETING_STATUSES } },
    include: {
      contacts: true,
      assignedMarketing: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { updatedAt: 'asc' },
  })

  const newCount = allLeads.filter((l) => l.marketingTag === 'NEW').length
  const reactivatedCount = allLeads.filter((l) => l.marketingTag === 'RE-ACTIVATED').length
  const errorCount = allLeads.filter((l) => l.marketingTag === 'FIXED').length

  return (
    <InboxBoard
      tab={tab}
      allLeads={allLeads}
      currentUserId={currentUser?.id ?? null}
      newCount={newCount}
      reactivatedCount={reactivatedCount}
      errorCount={errorCount}
    />
  )
}
