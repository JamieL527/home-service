'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function startContacting(leadId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'CONTACTING' as never },
  })
  revalidatePath('/marketing/inbox')
}

export async function markNoResponse(leadId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: 'NO_RESPONSE' as never,
      retryCount: { increment: 1 },
    },
  })
  revalidatePath('/marketing/inbox')
}

export async function markContactEstablished(leadId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'CONTACT_ESTABLISHED' as never },
  })
  revalidatePath('/marketing/inbox')
}

export async function retryContact(leadId: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'CONTACTING' as never },
  })
  revalidatePath('/marketing/inbox')
}

export async function parkLeadMarketing(leadId: string, reason: string, reInjectAt?: Date) {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: 'PARKED' as never,
      marketingNote: reason,
      scheduledInjectAt: reInjectAt ?? null,
    },
  })
  revalidatePath('/marketing/inbox')
  revalidatePath('/admin/parking')
}

export async function setFollowUpDate(leadId: string, dateStr: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { nextFollowUpDate: new Date(dateStr) },
  })
  revalidatePath('/marketing/inbox')
}

export async function qualifyLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { contacts: { take: 1 } },
  })
  if (!lead) return

  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: { status: 'QUALIFIED' as never },
    }),
    prisma.deal.create({
      data: {
        leadId,
        projectName: lead.address,
        clientName: lead.contacts[0]?.name ?? null,
        phase: lead.phase ?? null,
      },
    }),
  ])
  revalidatePath('/marketing/inbox')
}

export async function updateMarketingNote(leadId: string, note: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { marketingNote: note },
  })
  revalidatePath('/marketing/inbox')
}

export async function updateSentimentTag(leadId: string, tag: string | null) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { sentimentTag: tag },
  })
  revalidatePath('/marketing/inbox')
}
