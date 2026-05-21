'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { normalizeUrl } from '@/lib/utils'

async function getActiveCompany() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const prismaUser = await prisma.user.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' } },
    include: { contractorCompany: true },
  })
  if (!prismaUser?.contractorCompany) return null
  if (prismaUser.contractorCompany.status !== 'ACTIVE') return null
  return prismaUser.contractorCompany
}

export async function updateContractorProfile(data: {
  contactName: string
  contactTitle: string
  contactEmail: string
  contactPhone: string
  website: string
  address: string
  logoUrl?: string
}): Promise<{ ok?: boolean; error?: string }> {
  const company = await getActiveCompany()
  if (!company) return { error: 'Unauthorized' }

  await prisma.contractorCompany.update({
    where: { id: company.id },
    data: {
      contactName: data.contactName.trim() || null,
      contactTitle: data.contactTitle.trim() || null,
      contactEmail: data.contactEmail.trim() || null,
      contactPhone: data.contactPhone.trim() || null,
      website: normalizeUrl(data.website),
      address: data.address.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
    },
  })

  revalidatePath('/contractor/profile')
  return { ok: true }
}
