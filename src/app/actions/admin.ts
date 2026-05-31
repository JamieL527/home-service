'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/mailer'

async function getContractorContact(companyId: string): Promise<{ email: string; firstName: string } | null> {
  const company = await prisma.contractorCompany.findUnique({
    where: { id: companyId },
    include: { users: { take: 1, select: { email: true, firstName: true } } },
  })
  const user = company?.users[0]
  if (!user) return null
  return { email: user.email, firstName: user.firstName ?? 'there' }
}

export async function approveContractor(companyId: string) {
  await prisma.contractorCompany.update({
    where: { id: companyId },
    data: { status: 'ACTIVE' },
  })

  const contact = await getContractorContact(companyId)
  if (contact) {
    const headersList = await headers()
    const origin = headersList.get('origin') ?? 'https://constructionmarket.ca'
    const loginUrl = `${origin}/login`
    const html = approvalEmailHtml(contact.firstName, loginUrl)
    await sendMail({
      to: contact.email,
      subject: 'Your Construction Market account is approved',
      text: `Hi ${contact.firstName}, your contractor account has been approved. Sign in at ${loginUrl}`,
      html,
    })
  }

  revalidatePath('/admin/contractors')
}

export async function rejectContractor(companyId: string, reason?: string) {
  await prisma.contractorCompany.update({
    where: { id: companyId },
    data: { status: 'REJECTED', adminNote: reason || null },
  })

  const contact = await getContractorContact(companyId)
  if (contact) {
    const rejectionReason = reason?.trim() || 'No specific reason was provided.'
    const html = rejectionEmailHtml(contact.firstName, rejectionReason)
    await sendMail({
      to: contact.email,
      subject: 'Update on your Construction Market application',
      text: `Hi ${contact.firstName}, after reviewing your application, we're unable to approve your account at this time. Reason: ${rejectionReason}`,
      html,
    })
  }

  revalidatePath('/admin/contractors')
}

export async function requestMoreInfo(companyId: string, note?: string) {
  await prisma.contractorCompany.update({
    where: { id: companyId },
    data: { status: 'ACTION_REQUIRED', adminNote: note || null },
  })

  const contact = await getContractorContact(companyId)
  if (contact) {
    const headersList = await headers()
    const origin = headersList.get('origin') ?? 'https://constructionmarket.ca'
    const loginUrl = `${origin}/login`
    const itemsNeeded = note?.trim() || 'Please log in and review your profile for any missing or incorrect information.'
    const html = needsMoreInfoEmailHtml(contact.firstName, itemsNeeded, loginUrl)
    await sendMail({
      to: contact.email,
      subject: 'Quick follow-up on your Construction Market application',
      text: `Hi ${contact.firstName}, we need a bit more information: ${itemsNeeded}. Update your profile at ${loginUrl}`,
      html,
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
  const zoneIds = (formData.getAll('zoneIds') as string[]).filter(Boolean)

  if (!email) return { error: 'Email is required.' }
  if (!['ADMIN', 'SALES', 'MARKETING', 'DATA_COLLECTOR'].includes(role)) {
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
    data: {
      email,
      role: role as 'ADMIN' | 'SALES' | 'MARKETING' | 'DATA_COLLECTOR',
      invitedAt: new Date(),
      zones: role === 'DATA_COLLECTOR' && zoneIds.length > 0
        ? { connect: zoneIds.map(id => ({ id })) }
        : undefined,
    },
  })

  revalidatePath('/admin/users')
  return { success: true }
}

export async function updateUserZones(userId: string, zoneIds: string[]) {
  await prisma.user.update({
    where: { id: userId },
    data: { zones: { set: zoneIds.map(id => ({ id })) } },
  })
  revalidatePath('/admin/users')
}

export async function resendInvite(email: string): Promise<{ success: boolean; error?: string }> {
  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'
  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/accept-invite`,
  })
  revalidatePath('/admin/users')
  if (error) return { success: false, error: error.message }
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

export async function suspendInternalUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { userStatus: 'suspended' } })
  revalidatePath('/admin/users')
}

export async function reactivateInternalUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { userStatus: 'active' } })
  revalidatePath('/admin/users')
}

export async function deactivateInternalUser(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { userStatus: 'deactivated' } })
  revalidatePath('/admin/users')
}

export async function changeUserRole(userId: string, role: string) {
  const validRoles = ['ADMIN', 'SALES', 'MARKETING', 'DATA_COLLECTOR']
  if (!validRoles.includes(role)) return
  await prisma.user.update({
    where: { id: userId },
    data: { role: role as never },
  })
  revalidatePath('/admin/users')
}

export async function suspendContractor(companyId: string) {
  await prisma.contractorCompany.update({
    where: { id: companyId },
    data: { status: 'SUSPENDED' },
  })
  revalidatePath('/admin/users')
}

export async function unsuspendContractor(companyId: string) {
  await prisma.contractorCompany.update({
    where: { id: companyId },
    data: { status: 'ACTIVE' },
  })
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
      where: { companyId },
      data: { companyId: null },
    }),
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

// ── Email HTML templates ──────────────────────────────────────────────────────

function approvalEmailHtml(firstName: string, loginUrl: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your account is approved – Construction Market</title></head><body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;"><tr><td align="center" style="padding:20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;"><tr><td style="background-color:#0a0a0a;padding:30px 40px 20px 40px;text-align:left;"><p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;">Hi ${firstName},</p><p style="margin:0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.5;">Good news – your Construction Market account has been approved.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:10px 40px 30px 40px;text-align:center;"><h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:bold;font-family:Arial,sans-serif;">You're In</h1><p style="margin:0;color:#00e5ff;font-size:13px;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Account Active</p></td></tr><tr><td style="background-color:#13131f;padding:30px 40px;border-left:3px solid #00e5ff;"><p style="margin:0 0 20px 0;color:#cccccc;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">Your contractor dashboard is now live. Sign in to see your account.</p><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center"><a href="${loginUrl}" style="display:block;background-color:#00e5ff;color:#000000;text-decoration:none;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;padding:14px 20px;text-align:center;border-radius:4px;">Go to my account</a></td></tr></table></td></tr><tr><td style="background-color:#0a0a0a;height:2px;"></td></tr><tr><td style="background-color:#13131f;padding:30px 40px;border-left:3px solid #7c3aed;"><p style="margin:0 0 16px 0;color:#ffffff;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;letter-spacing:1px;">WHAT HAPPENS NEXT</p><p style="margin:0 0 16px 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">We're sweeping active job sites in your service area. As leads come in that match your trade, they'll appear in your <strong style="color:#ffffff;">New Offers</strong> tab. You'll get an email when a new offer is ready.</p><p style="margin:0 0 12px 0;color:#cccccc;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;"><strong style="color:#ffffff;">For each offer, you'll be able to:</strong></p><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="color:#cccccc;font-size:13px;font-family:Arial,sans-serif;padding:3px 0;">• Review the project, plans, and scope</td></tr><tr><td style="color:#cccccc;font-size:13px;font-family:Arial,sans-serif;padding:3px 0;">• Take off measurements</td></tr><tr><td style="color:#cccccc;font-size:13px;font-family:Arial,sans-serif;padding:3px 0;">• Build and submit a quote</td></tr></table><p style="margin:16px 0 0 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">Our team handles introductions to the builder and walks the deal through to a signed agreement.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:24px 40px 30px 40px;border-top:1px solid #222222;"><p style="margin:0 0 4px 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;">Welcome aboard,</p><p style="margin:0 0 2px 0;color:#ffffff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;">Seyed Amir Sajjadi</p><p style="margin:0 0 2px 0;color:#888888;font-size:12px;font-family:Arial,sans-serif;">Founder &amp; CEO | Construction Market</p><p style="margin:0;color:#888888;font-size:12px;font-family:Arial,sans-serif;">build@constructionmarket.ca &nbsp;|&nbsp; 437-450-3116 &nbsp;|&nbsp; constructionmarket.ca</p></td></tr></table></td></tr></table></body></html>`
}

function rejectionEmailHtml(firstName: string, rejectionReason: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Application update – Construction Market</title></head><body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;"><tr><td align="center" style="padding:20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;"><tr><td style="background-color:#0a0a0a;padding:30px 40px 20px 40px;text-align:left;"><p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;">Hi ${firstName},</p><p style="margin:0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.5;">Thank you for applying to Construction Market.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:10px 40px 30px 40px;text-align:center;"><h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:bold;font-family:Arial,sans-serif;">Application Update</h1><p style="margin:0;color:#888888;font-size:13px;font-family:Arial,sans-serif;">A note about your application status</p></td></tr><tr><td style="background-color:#13131f;padding:30px 40px;border-left:3px solid #666666;"><p style="margin:0 0 20px 0;color:#cccccc;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">After reviewing your application, we're unable to approve your account at this time.</p><p style="margin:0 0 12px 0;color:#ffffff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;letter-spacing:1px;">REASON</p><table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;border-radius:4px;margin:0 0 24px 0;"><tr><td style="padding:16px 20px;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;border-left:2px solid #666666;">${rejectionReason}</td></tr></table><p style="margin:0 0 16px 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">If your situation changes – for example, you obtain WSIB coverage, expand your service area, or update your insurance – you're welcome to reapply in the future.</p><p style="margin:0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">If you believe this decision was made in error, or you'd like to discuss it, please reply to this email or call us.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:24px 40px 30px 40px;border-top:1px solid #222222;"><p style="margin:0 0 4px 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;">Best regards,</p><p style="margin:0 0 2px 0;color:#ffffff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;">The Construction Market team</p><p style="margin:0;color:#888888;font-size:12px;font-family:Arial,sans-serif;">build@constructionmarket.ca &nbsp;|&nbsp; 437-450-3116 &nbsp;|&nbsp; constructionmarket.ca</p></td></tr></table></td></tr></table></body></html>`
}

function needsMoreInfoEmailHtml(firstName: string, itemsNeeded: string, loginUrl: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>A few more details – Construction Market</title></head><body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;"><tr><td align="center" style="padding:20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;"><tr><td style="background-color:#0a0a0a;padding:30px 40px 20px 40px;text-align:left;"><p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;">Hi ${firstName},</p><p style="margin:0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.5;">Thanks for your Construction Market application.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:10px 40px 30px 40px;text-align:center;"><h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:bold;font-family:Arial,sans-serif;">A Few More Details</h1><p style="margin:0;color:#f97316;font-size:13px;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Action Required</p></td></tr><tr><td style="background-color:#13131f;padding:30px 40px;border-left:3px solid #f97316;"><p style="margin:0 0 20px 0;color:#cccccc;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">Before we can activate your account, we need a bit more information from you:</p><table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;border-radius:4px;margin:0 0 24px 0;"><tr><td style="padding:16px 20px;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;border-left:2px solid #f97316;">${itemsNeeded}</td></tr></table><p style="margin:0 0 20px 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">You can update your profile by signing in. Once we have these details, your account will be reviewed again – usually within one business day.</p><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center"><a href="${loginUrl}" style="display:block;background-color:#f97316;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;padding:14px 20px;text-align:center;border-radius:4px;">Update my profile</a></td></tr></table></td></tr><tr><td style="background-color:#0a0a0a;padding:20px 40px;text-align:center;border-top:1px solid #222222;"><p style="margin:0;color:#888888;font-size:12px;font-family:Arial,sans-serif;line-height:1.5;">If anything is unclear or you'd like to talk it through, reply to this email or call us.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:20px 40px 30px 40px;border-top:1px solid #222222;"><p style="margin:0 0 4px 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;">We're here to help,</p><p style="margin:0 0 2px 0;color:#ffffff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;">The Construction Market team</p><p style="margin:0;color:#888888;font-size:12px;font-family:Arial,sans-serif;">build@constructionmarket.ca &nbsp;|&nbsp; 437-450-3116 &nbsp;|&nbsp; constructionmarket.ca</p></td></tr></table></td></tr></table></body></html>`
}
