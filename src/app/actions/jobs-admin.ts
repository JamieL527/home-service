'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function updateJobDetails(
  jobId: string,
  data: {
    serviceType: string
    contractorType: string
    scope: string
    priceType: string
    priceFixed?: number | null
    priceMin?: number | null
    priceMax?: number | null
    timeline: string
  },
) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      serviceType: data.serviceType,
      contractorType: data.contractorType,
      scope: data.scope,
      priceType: data.priceType,
      priceFixed: data.priceFixed ?? null,
      priceMin: data.priceMin ?? null,
      priceMax: data.priceMax ?? null,
      timeline: data.timeline,
      status: 'READY' as never,
    },
  })
  revalidatePath('/admin/jobs')
}

export async function sendJobOffer(jobId: string, companyId: string) {
  await prisma.$transaction([
    prisma.jobOffer.create({
      data: { jobId, companyId },
    }),
    prisma.job.update({
      where: { id: jobId },
      data: { status: 'OFFER_SENT' as never, companyId },
    }),
  ])
  revalidatePath('/admin/jobs')
}

export async function cancelJob(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'CANCELLED' as never },
  })
  revalidatePath('/admin/jobs')
}

export async function verifyJob(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'VERIFIED' as never },
  })
  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
}
