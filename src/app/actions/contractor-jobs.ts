'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

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

export async function acceptOffer(offerId: string) {
  const company = await getActiveCompany()
  if (!company) return

  const offer = await prisma.jobOffer.findFirst({
    where: { id: offerId, companyId: company.id, status: 'pending' },
  })
  if (!offer) return

  await prisma.$transaction([
    prisma.jobOffer.update({
      where: { id: offerId },
      data: { status: 'accepted', respondedAt: new Date() },
    }),
    prisma.job.update({
      where: { id: offer.jobId },
      data: { status: 'ASSIGNED' as never, companyId: company.id },
    }),
  ])

  revalidatePath('/contractor/jobs')
}

export async function rejectOffer(offerId: string) {
  const company = await getActiveCompany()
  if (!company) return

  const offer = await prisma.jobOffer.findFirst({
    where: { id: offerId, companyId: company.id, status: 'pending' },
  })
  if (!offer) return

  await prisma.$transaction([
    prisma.jobOffer.update({
      where: { id: offerId },
      data: { status: 'rejected', respondedAt: new Date() },
    }),
    prisma.job.update({
      where: { id: offer.jobId },
      data: { status: 'READY' as never, companyId: null },
    }),
  ])

  revalidatePath('/contractor/jobs')
}

export async function updateJobStatus(jobId: string, status: 'IN_PROGRESS' | 'COMPLETED') {
  const company = await getActiveCompany()
  if (!company) return

  await prisma.job.update({
    where: { id: jobId, companyId: company.id },
    data: { status: status as never },
  })

  revalidatePath('/contractor/jobs')
  revalidatePath(`/contractor/jobs/${jobId}`)
}

export async function updateJobNote(jobId: string, note: string) {
  const company = await getActiveCompany()
  if (!company) return

  await prisma.job.update({
    where: { id: jobId, companyId: company.id },
    data: { progressNote: note.trim() || null },
  })

  revalidatePath(`/contractor/jobs/${jobId}`)
}

export async function addProgressPhoto(jobId: string, url: string) {
  const company = await getActiveCompany()
  if (!company) return { error: 'Unauthorized' }

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: company.id },
    select: { progressPhotos: true },
  })
  if (!job) return { error: 'Not found' }

  const existing = (job.progressPhotos as string[] | null) ?? []
  await prisma.job.update({
    where: { id: jobId },
    data: { progressPhotos: [...existing, url] },
  })

  revalidatePath(`/contractor/jobs/${jobId}`)
  revalidatePath(`/admin/jobs/${jobId}`)
  return { ok: true }
}

export async function removeProgressPhoto(jobId: string, url: string) {
  const company = await getActiveCompany()
  if (!company) return { error: 'Unauthorized' }

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: company.id },
    select: { progressPhotos: true },
  })
  if (!job) return { error: 'Not found' }

  const existing = (job.progressPhotos as string[] | null) ?? []
  await prisma.job.update({
    where: { id: jobId },
    data: { progressPhotos: existing.filter((u) => u !== url) },
  })

  revalidatePath(`/contractor/jobs/${jobId}`)
  revalidatePath(`/admin/jobs/${jobId}`)
  return { ok: true }
}
