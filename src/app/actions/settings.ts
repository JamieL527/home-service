'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function createZone(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const color = (formData.get('color') as string)?.trim() || null

  if (!name) return { error: 'Zone name is required.' }

  await prisma.zone.create({ data: { name, description, color } })
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function updateZone(id: string, formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const color = (formData.get('color') as string)?.trim() || null

  if (!name) return { error: 'Zone name is required.' }

  await prisma.zone.update({ where: { id }, data: { name, description, color } })
  revalidatePath('/admin/settings')
  return { success: true }
}

export async function deleteZone(id: string) {
  // Unlink users before deleting
  await prisma.user.updateMany({ where: { zoneId: id }, data: { zoneId: null } })
  await prisma.zone.delete({ where: { id } })
  revalidatePath('/admin/settings')
}
