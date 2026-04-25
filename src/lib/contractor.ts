import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function requireContractorUser() {
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
    include: { contractorCompany: true },
  })

  if (!prismaUser?.contractorCompany) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const { status } = prismaUser.contractorCompany
  if (status === 'UNVERIFIED_PROFILE' || status === 'ACTION_REQUIRED') {
    redirect('/register/business-profile')
  }
  if (status === 'PENDING_APPROVAL') {
    redirect('/register/pending')
  }
  if (status === 'REJECTED') {
    await supabase.auth.signOut()
    redirect('/login')
  }

  return {
    user: prismaUser,
    company: prismaUser.contractorCompany,
    email: user.email,
  }
}
