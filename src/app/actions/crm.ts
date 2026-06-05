'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createContact(formData: FormData) {
  await prisma.contact.create({
    data: {
      name: (formData.get('name') as string)?.trim() || null,
      company: (formData.get('company') as string)?.trim() || null,
      phone: (formData.get('phone') as string)?.trim() || null,
      email: (formData.get('email') as string)?.trim() || null,
      website: (formData.get('website') as string)?.trim() || null,
      hqAddress: (formData.get('hqAddress') as string)?.trim() || null,
      marketRole: (formData.get('marketRole') as string)?.trim() || null,
      subRole: (formData.get('subRole') as string)?.trim() || null,
      trade: (formData.get('trade') as string)?.trim() || null,
      sourceTable: 'manual',
    },
  })
  revalidatePath('/admin/crm')
}

export async function updateContact(id: string, formData: FormData) {
  await prisma.contact.update({
    where: { id },
    data: {
      name: (formData.get('name') as string)?.trim() || null,
      company: (formData.get('company') as string)?.trim() || null,
      phone: (formData.get('phone') as string)?.trim() || null,
      email: (formData.get('email') as string)?.trim() || null,
      website: (formData.get('website') as string)?.trim() || null,
      hqAddress: (formData.get('hqAddress') as string)?.trim() || null,
      marketRole: (formData.get('marketRole') as string)?.trim() || null,
      subRole: (formData.get('subRole') as string)?.trim() || null,
      trade: (formData.get('trade') as string)?.trim() || null,
    },
  })
  revalidatePath('/admin/crm')
}

export async function deleteContact(id: string) {
  await prisma.siteRole.deleteMany({ where: { contactId: id } })
  await prisma.contact.delete({ where: { id } })
  revalidatePath('/admin/crm')
}

export async function createSiteRole(formData: FormData) {
  await prisma.siteRole.create({
    data: {
      leadId: formData.get('leadId') as string,
      contactId: formData.get('contactId') as string,
      sideOnThisSite: formData.get('sideOnThisSite') as string,
      isDealer: formData.get('isDealer') === 'true',
      isGatekeeper: formData.get('isGatekeeper') === 'true',
      interactionType: (formData.get('interactionType') as string)?.trim() || null,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })
  revalidatePath('/admin/crm')
}

export async function updateSiteRole(id: string, formData: FormData) {
  await prisma.siteRole.update({
    where: { id },
    data: {
      sideOnThisSite: formData.get('sideOnThisSite') as string,
      isDealer: formData.get('isDealer') === 'true',
      isGatekeeper: formData.get('isGatekeeper') === 'true',
      interactionType: (formData.get('interactionType') as string)?.trim() || null,
      notes: (formData.get('notes') as string)?.trim() || null,
    },
  })
  revalidatePath('/admin/crm')
}

export async function deleteSiteRole(id: string) {
  await prisma.siteRole.delete({ where: { id } })
  revalidatePath('/admin/crm')
}
