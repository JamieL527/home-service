export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { LeadDetailView } from '@/components/shared/lead-detail-view'

export default async function SalesLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = await params
  const { from } = await searchParams

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { contacts: true, suppliers: true },
  })

  if (!lead) notFound()

  const fromJobs = from === 'jobs'

  return (
    <LeadDetailView
      lead={lead}
      backHref={fromJobs ? '/sales/jobs' : '/sales/pipeline'}
      backLabel={fromJobs ? '← Jobs' : '← Pipeline'}
      showMarketingNotes={true}
    />
  )
}
