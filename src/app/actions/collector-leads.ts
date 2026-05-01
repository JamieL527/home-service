'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

type PhotoCategory = 'site' | 'demand' | 'supply' | 'other'
type PhotosData = Record<PhotoCategory, string[]>

export async function addLeadPhoto(leadId: string, category: PhotoCategory, url: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { photos: true } })
  if (!lead) return
  const existing = (lead.photos as PhotosData | null) ?? { site: [], demand: [], supply: [], other: [] }
  await prisma.lead.update({
    where: { id: leadId },
    data: { photos: { ...existing, [category]: [...(existing[category] ?? []), url] } },
  })
  revalidatePath(`/collector/leads/${leadId}`)
  revalidatePath(`/admin/leads/${leadId}`)
}

export async function removeLeadPhoto(leadId: string, category: PhotoCategory, url: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { photos: true } })
  if (!lead) return
  const existing = (lead.photos as PhotosData | null) ?? { site: [], demand: [], supply: [], other: [] }
  await prisma.lead.update({
    where: { id: leadId },
    data: { photos: { ...existing, [category]: (existing[category] ?? []).filter((u) => u !== url) } },
  })
  revalidatePath(`/collector/leads/${leadId}`)
  revalidatePath(`/admin/leads/${leadId}`)
}

export async function resubmitLead(leadId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: 'RESUBMITTED' as never,
      submittedAt: new Date(),
      // Keep reviewComment so admin can see what was previously flagged
    },
  })
  revalidatePath(`/collector/leads/${leadId}`)
  revalidatePath('/collector/leads')
  revalidatePath('/collector/dashboard')
}

export async function updateLeadNotes(leadId: string, notes: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { initialComment: notes.trim() || null },
  })
  revalidatePath(`/collector/leads/${leadId}`)
}

export type ContactInput = {
  id?: string
  name: string
  email: string
  phone: string
  role: string
}

export type SupplierInput = {
  id?: string
  trade: string
  company: string
  contact: string
  phone: string
  email: string
  website: string
  officeLocation: string
  interaction: string
}

export async function updateLeadDetails(
  leadId: string,
  data: {
    businessName: string
    website: string
    officeLocation: string
    rating: string
    zoneName: string
    initialComment: string
    contacts: ContactInput[]
    suppliers: SupplierInput[]
  },
) {
  const { contacts, suppliers, ...fields } = data

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: leadId },
      data: {
        businessName: fields.businessName.trim() || null,
        website: fields.website.trim() || null,
        officeLocation: fields.officeLocation.trim() || null,
        rating: fields.rating.trim() || null,
        zoneName: fields.zoneName.trim() || null,
        initialComment: fields.initialComment.trim() || null,
      },
    })

    // Replace all contacts: delete existing, then create new ones
    await tx.leadContact.deleteMany({ where: { leadId } })
    const validContacts = contacts.filter(
      (c) => c.name.trim() || c.phone.trim() || c.email.trim(),
    )
    if (validContacts.length > 0) {
      await tx.leadContact.createMany({
        data: validContacts.map((c) => ({
          leadId,
          name: c.name.trim() || null,
          email: c.email.trim() || null,
          phone: c.phone.trim() || null,
          role: c.role.trim() || null,
        })),
      })
    }

    // Replace all suppliers: delete existing, then create new ones
    await tx.leadSupplier.deleteMany({ where: { leadId } })
    const validSuppliers = suppliers.filter(
      (s) => s.company.trim() || s.trade.trim() || s.contact.trim(),
    )
    if (validSuppliers.length > 0) {
      await tx.leadSupplier.createMany({
        data: validSuppliers.map((s) => ({
          leadId,
          trade: s.trade.trim() || null,
          company: s.company.trim() || null,
          contact: s.contact.trim() || null,
          phone: s.phone.trim() || null,
          email: s.email.trim() || null,
          website: s.website.trim() || null,
          officeLocation: s.officeLocation.trim() || null,
          interaction: s.interaction.trim() || null,
        })),
      })
    }
  })

  revalidatePath(`/collector/leads/${leadId}`)
  redirect(`/collector/leads/${leadId}`)
}
