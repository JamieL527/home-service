export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DealDetail } from '@/components/sales/deal-detail'

export default async function AdminDealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      lead: {
        select: {
          address: true,
          phase: true,
          source: true,
          contacts: true,
          businessName: true,
          initialComment: true,
          marketingNote: true,
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { serviceType: true, scope: true, contractorType: true, timeline: true },
          },
        },
      },
      quotes: { orderBy: { version: 'desc' } },
    },
  })

  if (!deal) notFound()

  const users = await prisma.user.findMany({
    where: { role: { in: ['SALES' as never, 'ADMIN' as never] } },
    select: { id: true, firstName: true, lastName: true, email: true },
  })

  return <DealDetail deal={deal} users={users} pipelinePath="/admin/sales" leadBasePath="/admin/leads" />
}
