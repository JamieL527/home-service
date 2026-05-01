import { prisma } from '@/lib/prisma'
import { PipelineBoard } from '@/components/sales/pipeline-board'

export default async function PipelinePage() {
  const deals = await prisma.deal.findMany({
    where: { status: 'active' },
    include: {
      lead: { select: { address: true, phase: true } },
      quotes: { orderBy: { version: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return <PipelineBoard deals={deals} />
}
