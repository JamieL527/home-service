'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

type ContactInput = {
  name?: string
  email?: string
  phone?: string
  role?: string
}

export async function createLead(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated.' }

  const prismaUser = await prisma.user.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' } },
  })
  if (!prismaUser || prismaUser.role !== 'DATA_COLLECTOR') {
    return { error: 'Unauthorized.' }
  }

  const address = (formData.get('address') as string)?.trim()
  if (!address) return { error: 'Address is required.' }

  const phase = (formData.get('phase') as string)?.trim() || null
  const initialComment = (formData.get('initialComment') as string)?.trim() || null
  const businessName = (formData.get('businessName') as string)?.trim() || null
  const officeLocation = (formData.get('officeLocation') as string)?.trim() || null
  const website = (formData.get('website') as string)?.trim() || null
  const rating = (formData.get('rating') as string)?.trim() || null
  const zoneName = (formData.get('zoneName') as string)?.trim() || null

  let contacts: ContactInput[] = []
  try {
    const raw = formData.get('contacts') as string
    if (raw) contacts = JSON.parse(raw)
  } catch {
    contacts = []
  }

  const hasContact = contacts.some(
    (c) => c.name?.trim() || c.email?.trim() || c.phone?.trim() || c.role?.trim()
  )
  const hasOtherField =
    phase || initialComment || businessName || officeLocation || website || rating || zoneName || hasContact

  if (!hasOtherField) {
    return { error: 'Please fill in at least one additional field besides address.' }
  }

  const lead = await prisma.lead.create({
    data: {
      address,
      phase,
      initialComment,
      businessName,
      officeLocation,
      website,
      rating,
      zoneName,
      createdById: prismaUser.id,
      status: 'SUBMITTED' as never,
    },
  })

  const validContacts = contacts.filter(
    (c) => c.name?.trim() || c.email?.trim() || c.phone?.trim() || c.role?.trim()
  )
  if (validContacts.length > 0) {
    await prisma.leadContact.createMany({
      data: validContacts.map((c) => ({
        leadId: lead.id,
        name: c.name?.trim() || null,
        email: c.email?.trim() || null,
        phone: c.phone?.trim() || null,
        role: c.role?.trim() || null,
      })),
    })
  }

  redirect('/collector/dashboard')
}
