'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/mailer'

async function getContractorEmail(companyId: string): Promise<string | null> {
  const company = await prisma.contractorCompany.findUnique({
    where: { id: companyId },
    include: { users: { take: 1 } },
  })
  return company?.users[0]?.email ?? null
}

export async function approveContractor(companyId: string) {
  await prisma.contractorCompany.update({
    where: { id: companyId },
    data: { status: 'ACTIVE' },
  })

  const email = await getContractorEmail(companyId)
  if (email) {
    await sendMail({
      to: email,
      subject: 'Your application has been approved',
      text: 'Congratulations! Your contractor account has been approved. You can now log in and start receiving job offers.',
    })
  }

  revalidatePath('/admin/contractors')
}

export async function rejectContractor(companyId: string, reason?: string) {
  await prisma.contractorCompany.update({
    where: { id: companyId },
    data: { status: 'REJECTED', adminNote: reason || null },
  })

  const email = await getContractorEmail(companyId)
  if (email) {
    const reasonText = reason?.trim()
      ? `Reason: ${reason.trim()}`
      : 'No specific reason was provided.'
    await sendMail({
      to: email,
      subject: 'Your application status update',
      text: `We regret to inform you that your application has been rejected. ${reasonText}`,
    })
  }

  revalidatePath('/admin/contractors')
}

export async function requestMoreInfo(companyId: string, note?: string) {
  await prisma.contractorCompany.update({
    where: { id: companyId },
    data: { status: 'ACTION_REQUIRED', adminNote: note || null },
  })

  const email = await getContractorEmail(companyId)
  if (email) {
    const detailsText = note?.trim()
      ? `Details: ${note.trim()}`
      : 'Please log in and review your profile for any missing or incorrect information.'
    await sendMail({
      to: email,
      subject: 'Action required - Additional information needed',
      text: `We need additional information to process your application. Please log in and update your profile. ${detailsText}`,
    })
  }

  revalidatePath('/admin/contractors')
}

export async function inviteInternalUser(
  _prevState: { error: string } | { success: true } | null,
  formData: FormData
): Promise<{ error: string } | { success: true } | null> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = formData.get('role') as string

  if (!email) return { error: 'Email is required.' }
  if (!['SALES', 'MARKETING', 'DATA_COLLECTOR'].includes(role)) {
    return { error: 'Invalid role selection.' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'A user with this email already exists.' }

  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/accept-invite`,
  })
  if (error) return { error: error.message }

  await prisma.user.create({
    data: { email, role: role as 'SALES' | 'MARKETING' | 'DATA_COLLECTOR' },
  })

  revalidatePath('/admin/users')
  return { success: true }
}

export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return

  await prisma.user.delete({ where: { id: userId } })

  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase.auth.admin.listUsers()
    const supabaseUser = data.users.find((u) => u.email === user.email)
    if (supabaseUser) {
      await adminSupabase.auth.admin.deleteUser(supabaseUser.id)
    }
  } catch {
    // Supabase deletion failed — user is already blocked since not in Prisma
  }

  revalidatePath('/admin/users')
}

export async function deleteContractor(companyId: string) {
  const company = await prisma.contractorCompany.findUnique({
    where: { id: companyId },
    include: { users: true },
  })
  if (!company) return

  const emails = company.users.map((u) => u.email)

  await prisma.$transaction([
    prisma.job.updateMany({
      where: { contractor: { companyId } },
      data: { contractorId: null },
    }),
    prisma.contractor.deleteMany({ where: { companyId } }),
    prisma.user.deleteMany({ where: { contractorCompanyId: companyId } }),
    prisma.contractorCompany.delete({ where: { id: companyId } }),
  ])

  try {
    const adminSupabase = createAdminClient()
    const { data } = await adminSupabase.auth.admin.listUsers()
    for (const email of emails) {
      const supabaseUser = data.users.find((u) => u.email === email)
      if (supabaseUser) {
        await adminSupabase.auth.admin.deleteUser(supabaseUser.id)
      }
    }
  } catch {
    // Supabase deletion failed — users are already blocked since not in Prisma
  }

  revalidatePath('/admin/contractor-management')
}
