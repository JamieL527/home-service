'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function injectLead(leadId: string, targetPhase?: string, assignedMarketingId?: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return
  const phase = targetPhase ?? lead.phase
  const currentStatus = lead.status as string

  let marketingTag: string
  if (currentStatus === 'RESUBMITTED') {
    marketingTag = 'FIXED'
  } else if (currentStatus === 'PARKED' || currentStatus === 'SCHEDULED' || lead.scheduledInjectAt) {
    marketingTag = 'RE-ACTIVATED'
  } else {
    marketingTag = 'NEW'
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: 'MARKETING_INBOX' as never,
      phase,
      marketingTag,
      assignedMarketingId: assignedMarketingId ?? null,
    },
  })
  revalidatePath('/admin/evaluation')
  revalidatePath('/admin/parking')
  revalidatePath('/marketing/inbox')
}

export async function parkLead(leadId: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { status: 'PARKED' as never } })
  revalidatePath('/admin/evaluation')
  revalidatePath('/admin/parking')
}

export async function markLeadUrgent(leadId: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { status: 'URGENT' as never, isUrgent: true } })
  revalidatePath('/admin/evaluation')
}

export async function backLead(leadId: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { status: 'BACKED' as never, isUrgent: false } })
  revalidatePath('/admin/evaluation')
}

export async function delayLead(leadId: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { status: 'SCHEDULED' as never } })
  revalidatePath('/admin/evaluation')
  revalidatePath('/admin/parking')
}

export async function unParkLead(leadId: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { status: 'BACKED' as never } })
  revalidatePath('/admin/parking')
  revalidatePath('/admin/evaluation')
}

export async function reEvaluateLead(leadId: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { status: 'SUBMITTED' as never, isUrgent: false } })
  revalidatePath('/admin/evaluation')
}

export async function moveLeadPhase(leadId: string, newPhase: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { phase: newPhase } })
  revalidatePath('/admin/parking')
}

export async function scheduleLeadInjection(leadId: string, date: Date) {
  await prisma.lead.update({ where: { id: leadId }, data: { scheduledInjectAt: date } })
  revalidatePath('/admin/parking')
}

export async function cancelLeadSchedule(leadId: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { scheduledInjectAt: null } })
  revalidatePath('/admin/parking')
}

export async function closeLead(leadId: string) {
  await prisma.lead.update({ where: { id: leadId }, data: { status: 'CLOSED' as never } })
  revalidatePath('/admin/parking')
}

export async function markLeadNeedsFix(leadId: string, comment: string) {
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: 'NEEDS_FIX' as never, reviewComment: comment },
  })
  revalidatePath('/admin/evaluation')
}
