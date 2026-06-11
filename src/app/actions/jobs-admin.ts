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

export async function createReferralLead(data: {
  address: string
  businessName?: string
  phase?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  serviceType: string
  contractorType: string
  scope: string
  timeline: string
}): Promise<{ jobId: string; dealId: string }> {
  const lead = await prisma.lead.create({
    data: {
      address: data.address,
      businessName: data.businessName || null,
      phase: data.phase || null,
      source: 'referral',
      status: 'QUALIFIED' as never,
    },
  })

  if (data.contactName || data.contactPhone || data.contactEmail) {
    await prisma.leadContact.create({
      data: {
        leadId: lead.id,
        name: data.contactName || null,
        phone: data.contactPhone || null,
        email: data.contactEmail || null,
        role: 'Client',
      },
    })
  }

  const deal = await prisma.deal.create({
    data: {
      leadId: lead.id,
      clientName: data.businessName || null,
      projectType: data.serviceType,
      status: 'active',
      currentStage: 'NEW_OPPORTUNITY',
    },
  })

  const job = await prisma.job.create({
    data: {
      leadId: lead.id,
      serviceType: data.serviceType,
      contractorType: data.contractorType,
      scope: data.scope,
      timeline: data.timeline,
      phase: data.phase || null,
      status: 'READY' as never,
    },
  })

  revalidatePath('/admin/jobs')
  return { jobId: job.id, dealId: deal.id }
}

export async function updateReferralJobDetails(
  jobId: string,
  data: {
    businessName?: string
    phase?: string
    contactId?: string
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    serviceType: string
    contractorType: string
    scope: string
    timelineStart?: string
    timelineEnd?: string
  },
) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { leadId: true } })
  if (!job) return

  const timeline = [
    data.timelineStart && `Start: ${data.timelineStart}`,
    data.timelineEnd && `End: ${data.timelineEnd}`,
  ].filter(Boolean).join(' / ')

  await prisma.lead.update({
    where: { id: job.leadId },
    data: { businessName: data.businessName || null, phase: data.phase || null },
  })

  if (data.contactId) {
    await prisma.leadContact.update({
      where: { id: data.contactId },
      data: { name: data.contactName || null, phone: data.contactPhone || null, email: data.contactEmail || null },
    })
  } else if (data.contactName || data.contactPhone || data.contactEmail) {
    await prisma.leadContact.create({
      data: {
        leadId: job.leadId,
        name: data.contactName || null,
        phone: data.contactPhone || null,
        email: data.contactEmail || null,
        role: 'Client',
      },
    })
  }

  await prisma.job.update({
    where: { id: jobId },
    data: {
      serviceType: data.serviceType,
      contractorType: data.contractorType,
      scope: data.scope,
      timeline: timeline || null,
      phase: data.phase || null,
    },
  })

  await prisma.deal.updateMany({
    where: { leadId: job.leadId },
    data: {
      projectType: data.serviceType || null,
      clientName: data.businessName || null,
      notes: data.scope || null,
      phase: data.phase || null,
    },
  })

  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
  revalidatePath('/sales/pipeline')
  revalidatePath('/admin/sales')
}

export async function deleteReferralJob(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { leadId: true, status: true, lead: { select: { source: true } } },
  })
  if (!job || job.lead.source !== 'referral' || (job.status as string) !== 'READY') return

  await prisma.$transaction([
    prisma.job.delete({ where: { id: jobId } }),
    prisma.deal.deleteMany({ where: { leadId: job.leadId } }),
    prisma.leadContact.deleteMany({ where: { leadId: job.leadId } }),
    prisma.siteRole.deleteMany({ where: { leadId: job.leadId } }),
    prisma.lead.delete({ where: { id: job.leadId } }),
  ])

  revalidatePath('/admin/jobs')
  revalidatePath('/sales/jobs')
}

export async function verifyJob(jobId: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'VERIFIED' as never },
  })
  revalidatePath('/admin/jobs')
  revalidatePath(`/admin/jobs/${jobId}`)
}
