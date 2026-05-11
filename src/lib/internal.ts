import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function requireInternalUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const prismaUser = await prisma.user.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' } },
  })

  if (!prismaUser || prismaUser.role === 'CONTRACTOR') {
    await supabase.auth.signOut()
    redirect('/login')
  }

  if (prismaUser.userStatus === 'suspended' || prismaUser.userStatus === 'deactivated') {
    await supabase.auth.signOut()
    redirect('/login?error=account_suspended')
  }

  return { user: prismaUser, email: user.email }
}
