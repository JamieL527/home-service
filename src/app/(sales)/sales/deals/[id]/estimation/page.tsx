export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { EstimationWorkspace } from '@/components/sales/estimation-workspace'

export default async function EstimationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const currentUser = authUser
    ? await prisma.user.findFirst({ where: { email: { equals: authUser.email!, mode: 'insensitive' } } })
    : null

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      lead: { select: { address: true, phase: true } },
      plans: { orderBy: { createdAt: 'asc' } },
      measurements: { orderBy: { createdAt: 'asc' } },
      comments: { include: { author: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: 'asc' } },
      quotes: { orderBy: { version: 'desc' } },
    },
  })

  if (!deal) notFound()

  return (
    <EstimationWorkspace
      deal={deal}
      currentUserId={currentUser?.id ?? ''}
      pipelinePath="/sales/pipeline"
    />
  )
}
