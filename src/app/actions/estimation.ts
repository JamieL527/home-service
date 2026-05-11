'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function addDealPlan(dealId: string, data: {
  name: string
  planType: string
  fileUrl: string
  fileType: string
}) {
  await prisma.dealPlan.create({ data: { dealId, ...data } })
  revalidatePath(`/sales/deals/${dealId}/estimation`)
}

export async function deleteDealPlan(planId: string, dealId: string) {
  await prisma.dealPlan.delete({ where: { id: planId } })
  revalidatePath(`/sales/deals/${dealId}/estimation`)
}

export async function addMeasurement(dealId: string, data: {
  label: string
  type: string
  value: number
  unit: string
  notes?: string
}) {
  await prisma.dealMeasurement.create({ data: { dealId, ...data } })
  revalidatePath(`/sales/deals/${dealId}/estimation`)
}

export async function deleteMeasurement(measurementId: string, dealId: string) {
  await prisma.dealMeasurement.delete({ where: { id: measurementId } })
  revalidatePath(`/sales/deals/${dealId}/estimation`)
}

export async function addComment(dealId: string, content: string, authorId: string) {
  await prisma.dealComment.create({ data: { dealId, content, authorId } })
  revalidatePath(`/sales/deals/${dealId}/estimation`)
}
