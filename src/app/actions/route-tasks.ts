'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

type LatLng = { lat: number; lng: number }

async function getAdminUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const prismaUser = await prisma.user.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' } },
    select: { id: true, role: true },
  })
  if (!prismaUser || prismaUser.role !== 'ADMIN') return null
  return prismaUser.id
}

async function getCollectorUser(): Promise<{ id: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  return prisma.user.findFirst({
    where: { email: { equals: user.email, mode: 'insensitive' }, role: 'DATA_COLLECTOR' },
    select: { id: true },
  })
}

export async function createRouteTask(data: {
  name: string
  polygon: LatLng[]
  color: string
  zoneId: string
}): Promise<{ ok?: boolean; error?: string; id?: string }> {
  const userId = await getAdminUserId()
  if (!userId) return { error: 'Unauthorized' }
  if (!data.name.trim()) return { error: 'Task name is required' }
  if (!data.zoneId) return { error: 'Zone is required' }
  if (!data.polygon || data.polygon.length < 3) return { error: 'Invalid polygon' }

  const task = await prisma.routeTask.create({
    data: {
      name: data.name.trim(),
      polygon: data.polygon,
      color: data.color || '#8b5cf6',
      zoneId: data.zoneId,
      createdById: userId,
    },
  })

  revalidatePath('/admin/routes')
  return { ok: true, id: task.id }
}

export async function deleteRouteTask(id: string): Promise<{ ok?: boolean; error?: string }> {
  const userId = await getAdminUserId()
  if (!userId) return { error: 'Unauthorized' }

  await prisma.routeTask.delete({ where: { id } })
  revalidatePath('/admin/routes')
  return { ok: true }
}

export async function updateRouteTaskStatus(
  id: string,
  status: 'active' | 'assigned' | 'in_progress' | 'completed'
): Promise<{ ok?: boolean; error?: string }> {
  const userId = await getAdminUserId()
  if (!userId) return { error: 'Unauthorized' }

  await prisma.routeTask.update({ where: { id }, data: { status } })
  revalidatePath('/admin/routes')
  revalidatePath('/collector/dashboard')
  return { ok: true }
}

// Collector accepts a task — uses DB transaction to prevent race conditions
export async function acceptRouteTask(id: string, _formData: FormData): Promise<void> {
  const collector = await getCollectorUser()
  if (!collector) return

  await prisma.$transaction(async (tx) => {
    const task = await tx.routeTask.findUnique({ where: { id }, select: { status: true, assignedToId: true } })
    if (!task || task.status !== 'active' || task.assignedToId !== null) return
    await tx.routeTask.update({
      where: { id },
      data: { status: 'assigned', assignedToId: collector.id },
    })
  })

  revalidatePath('/admin/routes')
  revalidatePath('/collector/dashboard')
  revalidatePath('/collector/routes')
}

// Collector releases a task — only allowed if no leads submitted yet
export async function releaseRouteTask(id: string, _formData: FormData): Promise<void> {
  const collector = await getCollectorUser()
  if (!collector) return

  await prisma.$transaction(async (tx) => {
    const task = await tx.routeTask.findUnique({
      where: { id },
      select: { status: true, assignedToId: true, _count: { select: { leads: true } } },
    })
    if (!task || task.assignedToId !== collector.id) return
    if (task._count.leads > 0) return // already submitted leads, cannot release
    await tx.routeTask.update({
      where: { id },
      data: { status: 'active', assignedToId: null },
    })
  })

  revalidatePath('/admin/routes')
  revalidatePath('/collector/dashboard')
  revalidatePath('/collector/routes')
}

export async function renameRouteTask(id: string, name: string): Promise<{ ok?: boolean; error?: string }> {
  const userId = await getAdminUserId()
  if (!userId) return { error: 'Unauthorized' }
  if (!name.trim()) return { error: 'Name is required' }

  await prisma.routeTask.update({ where: { id }, data: { name: name.trim() } })
  revalidatePath('/admin/routes')
  return { ok: true }
}

export async function adminReleaseRouteTask(id: string): Promise<{ ok?: boolean; error?: string }> {
  const userId = await getAdminUserId()
  if (!userId) return { error: 'Unauthorized' }

  await prisma.routeTask.update({
    where: { id },
    data: { status: 'active', assignedToId: null },
  })
  revalidatePath('/admin/routes')
  revalidatePath('/collector/dashboard')
  revalidatePath('/collector/routes')
  return { ok: true }
}

// Collector marks their own in_progress task as completed
export async function completeRouteTask(id: string, _formData: FormData): Promise<void> {
  const collector = await getCollectorUser()
  if (!collector) return

  const task = await prisma.routeTask.findUnique({
    where: { id },
    select: { assignedToId: true, status: true },
  })
  if (!task || task.assignedToId !== collector.id) return
  if (task.status !== 'in_progress' && task.status !== 'assigned') return

  await prisma.routeTask.update({
    where: { id },
    data: { status: 'completed' },
  })

  revalidatePath('/admin/routes')
  revalidatePath('/collector/dashboard')
  revalidatePath('/collector/routes')
}
