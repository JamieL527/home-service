'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sendCommentNotificationEmail } from '@/lib/email'

async function getRole() {
  const jar = await cookies()
  return jar.get('user-role')?.value ?? null
}

function isSalesOrAdmin(role: string | null) {
  return role === 'SALES' || role === 'ADMIN'
}

export async function addDealPlan(dealId: string, data: {
  name: string
  planType: string
  fileUrl: string
  fileType: string
}) {
  const role = await getRole()
  if (!isSalesOrAdmin(role) && role !== 'CONTRACTOR') throw new Error('Unauthorized')
  await prisma.dealPlan.create({ data: { dealId, ...data, uploadedByRole: role ?? 'SALES' } })
  revalidatePath(`/sales/deals/${dealId}/estimation`)
  revalidatePath(`/contractor/jobs`)
}

export async function deleteDealPlan(planId: string, dealId: string) {
  const role = await getRole()
  if (isSalesOrAdmin(role)) {
    await prisma.dealPlan.delete({ where: { id: planId } })
  } else if (role === 'CONTRACTOR') {
    // Contractors can only delete their own uploads
    await prisma.dealPlan.delete({ where: { id: planId, uploadedByRole: 'CONTRACTOR' } })
  } else {
    throw new Error('Unauthorized')
  }
  revalidatePath(`/sales/deals/${dealId}/estimation`)
  revalidatePath(`/contractor/jobs`)
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

  // Fire-and-forget email notification
  ;(async () => {
    try {
      const [author, deal] = await Promise.all([
        prisma.user.findUnique({
          where: { id: authorId },
          select: { firstName: true, lastName: true, email: true, role: true },
        }),
        prisma.deal.findUnique({
          where: { id: dealId },
          select: {
            projectName: true,
            leadId: true,
            ownerId: true,
            lead: {
              select: {
                address: true,
                jobs: {
                  where: { companyId: { not: null } },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                  select: { company: { select: { contactEmail: true, contactName: true } } },
                },
              },
            },
          },
        }),
      ])
      if (!author || !deal) return

      const authorName = author.firstName || author.lastName
        ? `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim()
        : author.email
      const projectName = deal.projectName || deal.lead.address
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      const isContractor = author.role === 'CONTRACTOR'

      if (isContractor) {
        // Find the most recent Sales/Admin who commented in this deal
        const lastStaffComment = await prisma.dealComment.findFirst({
          where: {
            dealId,
            authorId: { not: authorId },
            author: { role: { in: ['SALES' as never, 'ADMIN' as never] } },
          },
          orderBy: { createdAt: 'desc' },
          select: { author: { select: { email: true } } },
        })

        // Fall back to deal owner, then first admin
        let recipientEmail = lastStaffComment?.author.email ?? null
        if (!recipientEmail && deal.ownerId) {
          const owner = await prisma.user.findUnique({
            where: { id: deal.ownerId },
            select: { email: true },
          })
          recipientEmail = owner?.email ?? null
        }
        if (!recipientEmail) {
          const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' as never },
            select: { email: true },
          })
          recipientEmail = admin?.email ?? null
        }
        if (recipientEmail) {
          await sendCommentNotificationEmail({
            to: recipientEmail,
            authorName,
            content,
            projectName,
            dealUrl: `${baseUrl}/sales/deals/${dealId}/estimation`,
          })
        }
      } else {
        // Notify contractor contact email
        const contractorEmail = deal.lead.jobs[0]?.company?.contactEmail
        if (contractorEmail) {
          await sendCommentNotificationEmail({
            to: contractorEmail,
            authorName,
            content,
            projectName,
            dealUrl: `${baseUrl}/contractor/jobs`,
          })
        }
      }
    } catch {
      // Don't let email failure break the comment
    }
  })()
}
