export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { PipelineBoard } from '@/components/sales/pipeline-board'

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const currentUser = authUser
    ? await prisma.user.findFirst({ where: { email: { equals: authUser.email!, mode: 'insensitive' } } })
    : null

  const deals = await prisma.deal.findMany({
    include: {
      lead: { select: { address: true, phase: true, source: true } },
      quotes: { orderBy: { version: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return <PipelineBoard deals={deals} currentUserId={currentUser?.id ?? null} />
}
