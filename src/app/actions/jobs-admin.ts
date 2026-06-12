'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'

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
  const [job, company] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      select: { serviceType: true, scope: true, timeline: true, phase: true },
    }),
    prisma.contractorCompany.findUnique({
      where: { id: companyId },
      include: { users: { take: 1, select: { email: true, firstName: true } } },
    }),
  ])

  await prisma.$transaction([
    prisma.jobOffer.create({ data: { jobId, companyId } }),
    prisma.job.update({ where: { id: jobId }, data: { status: 'OFFER_SENT' as never, companyId } }),
  ])
  revalidatePath('/admin/jobs')

  const user = company?.users[0]
  if (user?.email) {
    const headersList = await headers()
    const origin = headersList.get('origin') ?? 'https://constructionmarket.ca'
    const jobsUrl = `${origin}/contractor/jobs`
    const html = newOfferEmailHtml({
      firstName: user.firstName ?? 'there',
      serviceType: job?.serviceType ?? '',
      scope: job?.scope ?? '',
      timeline: job?.timeline ?? '',
      phase: job?.phase ?? '',
      jobsUrl,
    })
    sendMail({
      to: user.email,
      subject: 'New job offer — Construction Market',
      text: `Hi ${user.firstName ?? 'there'}, you have a new job offer on Construction Market. Log in to view it: ${jobsUrl}`,
      html,
    }).catch(e => console.error('[offer email]', e))
  }
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
  ownerId?: string
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
      ...(data.ownerId ? { ownerId: data.ownerId } : {}),
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
    ownerId?: string
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
      ...(data.ownerId ? { ownerId: data.ownerId } : {}),
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

function newOfferEmailHtml({
  firstName,
  serviceType,
  scope,
  timeline,
  phase,
  jobsUrl,
}: {
  firstName: string
  serviceType: string
  scope: string
  timeline: string
  phase: string
  jobsUrl: string
}): string {
  const scopePreview = scope.length > 120 ? scope.slice(0, 120).trimEnd() + '…' : scope
  const details = [
    phase ? `• Phase: ${phase}` : '',
    timeline ? `• Timeline: ${timeline}` : '',
    scopePreview ? `• Scope: ${scopePreview}` : '',
  ]
    .filter(Boolean)
    .map(line => `<tr><td style="color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;padding:3px 0;">${line}</td></tr>`)
    .join('')

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New job offer – Construction Market</title></head><body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;"><tr><td align="center" style="padding:20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;"><tr><td style="background-color:#0a0a0a;padding:30px 40px 20px 40px;text-align:left;"><p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;">Hi ${firstName},</p><p style="margin:0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.5;">You have a new job offer waiting on Construction Market.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:10px 40px 30px 40px;text-align:center;"><h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:bold;font-family:Arial,sans-serif;">New Job Offer</h1><p style="margin:0;color:#00e5ff;font-size:13px;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">Action Required</p></td></tr><tr><td style="background-color:#13131f;padding:30px 40px;border-left:3px solid #00e5ff;"><p style="margin:0 0 16px 0;color:#cccccc;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">A new project has been matched to your trade. Here's a quick summary:</p><table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;border-radius:4px;margin:0 0 24px 0;"><tr><td style="padding:16px 20px;font-family:Arial,sans-serif;line-height:1.6;border-left:2px solid #00e5ff;"><p style="margin:0 0 10px 0;color:#ffffff;font-size:14px;font-weight:bold;">${serviceType || 'New Project'}</p><table cellpadding="0" cellspacing="0" border="0" width="100%">${details}</table></td></tr></table><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center"><a href="${jobsUrl}" style="display:block;background-color:#00e5ff;color:#000000;text-decoration:none;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;padding:14px 20px;text-align:center;border-radius:4px;">View Offer →</a></td></tr></table></td></tr><tr><td style="background-color:#13131f;padding:24px 40px;border-top:1px solid #222222;border-left:3px solid #7c3aed;"><p style="margin:0 0 12px 0;color:#ffffff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;letter-spacing:1px;">TO SUBMIT A QUOTE</p><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="color:#cccccc;font-size:13px;font-family:Arial,sans-serif;padding:3px 0;">• View plans and project details</td></tr><tr><td style="color:#cccccc;font-size:13px;font-family:Arial,sans-serif;padding:3px 0;">• Take measurements</td></tr><tr><td style="color:#cccccc;font-size:13px;font-family:Arial,sans-serif;padding:3px 0;">• Build and submit your quote</td></tr></table></td></tr><tr><td style="background-color:#0a0a0a;padding:24px 40px 30px 40px;border-top:1px solid #222222;"><p style="margin:0 0 4px 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;">Best regards,</p><p style="margin:0 0 2px 0;color:#ffffff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;">The Construction Market team</p><p style="margin:0;color:#888888;font-size:12px;font-family:Arial,sans-serif;">build@constructionmarket.ca &nbsp;|&nbsp; 437-450-3116 &nbsp;|&nbsp; constructionmarket.ca</p></td></tr></table></td></tr></table></body></html>`
}
