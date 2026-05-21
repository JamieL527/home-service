export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { requireContractorUser } from '@/lib/contractor'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { EstimationWorkspace } from '@/components/sales/estimation-workspace'

export default async function ContractorEstimationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { company } = await requireContractorUser()

  const job = await prisma.job.findFirst({
    where: { id, companyId: company.id },
    select: { leadId: true, status: true },
  })
  if (!job) notFound()

  const ACTIVE_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED']
  if (!ACTIVE_STATUSES.includes(job.status as string)) notFound()

  const deal = await prisma.deal.findFirst({
    where: { leadId: job.leadId },
    orderBy: { createdAt: 'desc' },
    include: {
      lead: { select: { address: true, phase: true } },
      plans: { orderBy: { createdAt: 'desc' } },
      measurements: { orderBy: { createdAt: 'asc' } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      quotes: { orderBy: { version: 'desc' } },
    },
  })
  if (!deal) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUser = user
    ? await prisma.user.findFirst({ where: { email: { equals: user.email!, mode: 'insensitive' } } })
    : null

  return (
    <EstimationWorkspace
      deal={deal}
      currentUserId={currentUser?.id ?? ''}
      pipelinePath={`/contractor/jobs/${id}`}
      role="contractor"
      readOnly={true}
    />
  )
}
