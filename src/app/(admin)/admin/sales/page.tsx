export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { PipelineBoard } from '@/components/sales/pipeline-board'

export default async function AdminSalesPage() {
  const deals = await prisma.deal.findMany({
    include: {
      lead: { select: { address: true, phase: true, source: true } },
      quotes: { orderBy: { version: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return <PipelineBoard deals={deals} currentUserId={null} basePath="/admin/sales" />
}
