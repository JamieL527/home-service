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

  // Verify this job belongs to this contractor, fetch scope/timeline directly
  const job = await prisma.job.findFirst({
    where: { id, companyId: company.id },
    select: { leadId: true, status: true, scope: true, serviceType: true, contractorType: true, timeline: true },
  })
  if (!job) notFound()

  const ACTIVE_STATUSES = ['OFFER_SENT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED']
  if (!ACTIVE_STATUSES.includes(job.status as string)) notFound()

  const deal = await prisma.deal.findFirst({
    where: { leadId: job.leadId },
    orderBy: { createdAt: 'desc' },
    include: {
      lead: { select: { address: true, phase: true, source: true } },
      plans: { orderBy: { createdAt: 'desc' } },
      measurements: { orderBy: { createdAt: 'asc' } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      },
      quotes: { orderBy: { version: 'desc' } },
    },
  })
  if (!deal) notFound()

  const jobInfo = { scope: job.scope, serviceType: job.serviceType, contractorType: job.contractorType, timeline: job.timeline }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUser = user
    ? await prisma.user.findFirst({ where: { email: { equals: user.email!, mode: 'insensitive' } } })
    : null

  return (
    <>
      <EstimationWorkspace
        deal={deal}
        currentUserId={currentUser?.id ?? ''}
        pipelinePath="/contractor/jobs"
        role="contractor"
        job={jobInfo}
        companyName={company.name}
        companyLogoUrl={company.logoUrl}
        companyCredentials={company.wsibNumber ? `WSIB #${company.wsibNumber} · Insured` : null}
      />
    </>
  )
}
