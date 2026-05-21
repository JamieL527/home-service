export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireContractorUser } from '@/lib/contractor'

import { EstimationWorkspace } from '@/components/sales/estimation-workspace'

export default async function ContractorQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { company, user } = await requireContractorUser()

  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      companyId: true,
      status: true,
      lead: {
        select: {
          source: true,
          deals: {
            take: 1,
            include: {
              plans: { orderBy: { createdAt: 'asc' } },
              measurements: { orderBy: { createdAt: 'asc' } },
              comments: {
                include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } },
                orderBy: { createdAt: 'asc' },
              },
              quotes: { orderBy: { version: 'desc' } },
              lead: { select: { address: true, phase: true } },
            },
          },
        },
      },
    },
  })

  if (!job) notFound()
  // Only the invited contractor can access this page
  if (job.companyId !== company.id) notFound()
  // Only referral jobs have a quote page
  if (job.lead.source !== 'referral') notFound()

  const deal = job.lead.deals[0]
  if (!deal) notFound()

  return (
    <EstimationWorkspace
      deal={deal}
      currentUserId={user.id}
      pipelinePath="/contractor/jobs"
      role="contractor"
    />
  )
}
