import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function requireCollectorUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const prismaUser = await prisma.user.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' } },
    include: { zone: true },
  })

  if (!prismaUser || prismaUser.role !== 'DATA_COLLECTOR') {
    await supabase.auth.signOut()
    redirect('/login')
  }

  return { user: prismaUser, email: user.email }
}
