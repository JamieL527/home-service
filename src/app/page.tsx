import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const ROLE_ROUTES: Record<string, string> = {
  ADMIN:          '/admin/dashboard',
  SALES:          '/sales',
  MARKETING:      '/marketing/inbox',
  DATA_COLLECTOR: '/collector/dashboard',
  CONTRACTOR:     '/contractor/overview',
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  const prismaUser = await prisma.user.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' } },
    select: { role: true },
  })

  const destination = prismaUser?.role && ROLE_ROUTES[prismaUser.role]
    ? ROLE_ROUTES[prismaUser.role]
    : '/login'

  redirect(destination)
}
