export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { LeadDetailView } from '@/components/shared/lead-detail-view'

export default async function SalesLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { contacts: true, suppliers: true },
  })

  if (!lead) notFound()

  return (
    <LeadDetailView
      lead={lead}
      backHref="/sales/pipeline"
      backLabel="← Pipeline"
      showMarketingNotes={true}
    />
  )
}
