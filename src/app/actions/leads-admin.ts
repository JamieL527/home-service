'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function injectLead(leadId: string, targetPhase?: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return
  const phase = targetPhase ?? lead.phase
  await prisma.$transaction([
    prisma.lead.update({ where: { id: leadId }, data: { status: 'INJECTED' as never, phase } }),
    prisma.job.create({ data: { leadId, status: 'PENDING' as never, phase } }),
  ])
  revalidatePath('/admin/evaluation')
  revalidatePath('/admin/parking')
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
