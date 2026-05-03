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

type SupplierInput = {
  trade?: string
  company?: string
  contact?: string
  phone?: string
  email?: string
  website?: string
  officeLocation?: string
  interaction?: string
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

  const latRaw = formData.get('lat') as string
  const lngRaw = formData.get('lng') as string
  const lat = latRaw ? parseFloat(latRaw) : null
  const lng = lngRaw ? parseFloat(lngRaw) : null

  const phase = (formData.get('phase') as string)?.trim() || null
  const initialComment = (formData.get('initialComment') as string)?.trim() || null
  const businessName = (formData.get('businessName') as string)?.trim() || null
  const officeLocation = (formData.get('officeLocation') as string)?.trim() || null
  const website = (formData.get('website') as string)?.trim() || null
  const rating = (formData.get('rating') as string)?.trim() || null
  const zoneName = (formData.get('zoneName') as string)?.trim() || null
  const zoneId = (formData.get('zoneId') as string)?.trim() || null
  let ocrData: object | null = null
  try {
    const raw = formData.get('ocrData') as string
    if (raw) ocrData = JSON.parse(raw)
  } catch { ocrData = null }

  let cityData: object | null = null
  try {
    const raw = formData.get('cityData') as string
    if (raw) cityData = JSON.parse(raw)
  } catch { cityData = null }

  let suppliers: SupplierInput[] = []
  try {
    const raw = formData.get('supply') as string
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) suppliers = parsed
    }
  } catch { suppliers = [] }

  let photosData: object | null = null
  try {
    const raw = formData.get('photos') as string
    if (raw) {
      const parsed = JSON.parse(raw)
      const hasAny = parsed && typeof parsed === 'object' &&
        Object.values(parsed).some((arr) => Array.isArray(arr) && (arr as string[]).length > 0)
      if (hasAny) photosData = parsed
    }
  } catch { photosData = null }

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
      lat: lat && !isNaN(lat) ? lat : undefined,
      lng: lng && !isNaN(lng) ? lng : undefined,
      phase,
      initialComment,
      businessName,
      officeLocation,
      website,
      rating,
      zoneId,
      zoneName,
      ocrData: ocrData ?? undefined,
      cityData: cityData ?? undefined,
      photos: photosData ?? undefined,
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

  const validSuppliers = suppliers.filter(
    (s) => s.company?.trim() || s.trade?.trim() || s.contact?.trim()
  )
  if (validSuppliers.length > 0) {
    await prisma.leadSupplier.createMany({
      data: validSuppliers.map((s) => ({
        leadId: lead.id,
        trade: s.trade?.trim() || null,
        company: s.company?.trim() || null,
        contact: s.contact?.trim() || null,
        phone: s.phone?.trim() || null,
        email: s.email?.trim() || null,
        website: s.website?.trim() || null,
        officeLocation: s.officeLocation?.trim() || null,
        interaction: s.interaction?.trim() || null,
      })),
    })
  }

  redirect('/collector/dashboard')
}
