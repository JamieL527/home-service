'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sendQuoteEmail } from '@/lib/email'
import { sendMail } from '@/lib/mailer'
import { generateInvoicePdf } from '@/lib/generate-invoice'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type LineItem = { description: string; quantity: number; unitPrice: number; unit?: string }

async function generateAndUploadInvoicePdf(
  dealId: string,
  quoteVersion: number,
  lineItems: LineItem[],
  subtotal: number,
  tax: number,
  total: number,
  notes?: string | null,
): Promise<string | null> {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        clientName: true,
        projectName: true,
        lead: {
          select: {
            address: true,
            contacts: { select: { name: true, email: true }, take: 5 },
            jobs: {
              where: { companyId: { not: null } },
              take: 1,
              select: {
                serviceType: true,
                contractorType: true,
                company: { select: { name: true, logoUrl: true } },
              },
            },
          },
        },
      },
    })
    if (!deal) return null

    const job = deal.lead.jobs[0]
    const company = job?.company
    const trade = job?.serviceType || job?.contractorType || null

    // Stable 6-digit base derived from dealId (same logic as client-side dealQuoteNo)
    let h = 0
    for (let i = 0; i < dealId.length; i++) {
      h = Math.imul(31, h) + dealId.charCodeAt(i) | 0
    }
    const base = (Math.abs(h) % 900000) + 100000
    const invoiceNumber = `Q-${base}-V${quoteVersion}`

    const today = new Date()
    const validDate = new Date(today)
    validDate.setDate(validDate.getDate() + 30)
    const fmt = (d: Date) => d.toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })

    const buffer = await generateInvoicePdf({
      invoiceNumber,
      contractorName: company?.name ?? 'Contractor',
      contractorLogoUrl: company?.logoUrl ?? null,
      projectAddress: deal.lead.address,
      trade,
      lineItems,
      subtotal,
      tax,
      total,
      taxRate: subtotal > 0 ? Math.round((tax / subtotal) * 100) : 13,
      notes,
      issueDate: fmt(today),
      validUntil: fmt(validDate),
    })

    const path = `invoices/${dealId}/v${quoteVersion}.pdf`
    const { error } = await supabaseAdmin.storage
      .from('deal-plans')
      .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
    if (error) throw error

    const { data } = supabaseAdmin.storage.from('deal-plans').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    console.error('Failed to generate invoice PDF:', err)
    return null
  }
}

async function requireSalesOrAdmin() {
  const jar = await cookies()
  const role = jar.get('user-role')?.value
  if (role !== 'SALES' && role !== 'ADMIN') throw new Error('Unauthorized')
}

const STAGE_ORDER = ['NEW_OPPORTUNITY', 'DISCOVERY', 'ESTIMATION', 'QUOTE_SENT', 'NEGOTIATION']

async function maybeSendQuoteEmail(dealId: string, lineItems: Array<{ description: string; quantity: number; unitPrice: number }>, subtotal: number, tax: number, total: number, notes?: string | null, version?: number) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      lead: {
        include: {
          contacts: true,
          jobs: { where: { companyId: { not: null } }, take: 1 },
        },
      },
      quotes: { orderBy: { version: 'desc' }, take: 5, select: { pdfUrl: true, version: true } },
    },
  })
  if (!deal) return
  const contactEmail = deal.lead.contacts.find(c => c.email)?.email
  const toEmail = contactEmail || process.env.RESEND_TO_OVERRIDE || ''
  if (!toEmail) return
  // Find the PDF from the contractor's submitted quote
  const pdfUrl = deal.quotes.find(q => q.pdfUrl)?.pdfUrl ?? null
  let pdfBuffer: Buffer | null = null
  if (pdfUrl) {
    try {
      const res = await fetch(pdfUrl)
      if (res.ok) pdfBuffer = Buffer.from(await res.arrayBuffer())
    } catch { /* skip attachment if fetch fails */ }
  }

  await sendQuoteEmail({
    to: toEmail,
    projectName: deal.projectName || deal.lead.address,
    clientName: deal.clientName || deal.lead.contacts[0]?.name || 'Valued Client',
    quoteVersion: version ?? 1,
    lineItems,
    subtotal,
    tax,
    total,
    notes,
    pdfBuffer,
  }).catch(err => console.error('Failed to send quote email:', err))
}

function getNextStage(current: string): string | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]
}

export async function moveDealToNextStage(dealId: string) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { leadId: true, currentStage: true, phase: true } })
  if (!deal) return
  const next = getNextStage(deal.currentStage)
  if (!next) return
  await prisma.deal.update({ where: { id: dealId }, data: { currentStage: next } })
  if (next === 'ESTIMATION') {
    const existingJob = await prisma.job.findFirst({ where: { leadId: deal.leadId } })
    if (!existingJob) {
      await prisma.job.create({
        data: { leadId: deal.leadId, status: 'PENDING' as never, phase: deal.phase ?? null },
      })
      revalidatePath('/admin/jobs')
    }
  }
  revalidatePath('/sales/pipeline')
  revalidatePath(`/sales/deals/${dealId}`)
}

export async function updateDeal(
  dealId: string,
  data: {
    projectName?: string | null
    clientName?: string | null
    projectType?: string | null
    phase?: string | null
    estimatedValue?: number | null
    ownerId?: string | null
    notes?: string | null
    siteVisitDate?: Date | null
    deadline?: Date | null
    negotiationDate?: Date | null
  },
) {
  await prisma.deal.update({ where: { id: dealId }, data })
  revalidatePath('/sales/pipeline')
  revalidatePath(`/sales/deals/${dealId}`)
}

export async function markDealWon(dealId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      lead: { select: { source: true } },
      quotes: {
        where: { status: 'accepted' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!deal) return

  const acceptedQuote = deal.quotes[0]
  const isReferral = deal.lead.source === 'referral'

  if (isReferral) {
    await prisma.deal.update({ where: { id: dealId }, data: { status: 'won' } })
  } else {
    const existingJob = await prisma.job.findFirst({ where: { leadId: deal.leadId } })
    if (existingJob) {
      // Job already created at ESTIMATION stage — just mark deal won
      await prisma.deal.update({ where: { id: dealId }, data: { status: 'won' } })
    } else {
      await prisma.$transaction([
        prisma.deal.update({ where: { id: dealId }, data: { status: 'won' } }),
        prisma.job.create({
          data: {
            leadId: deal.leadId,
            status: 'PENDING' as never,
            phase: deal.phase,
            priceType: acceptedQuote?.total ? 'fixed' : null,
            priceFixed: acceptedQuote?.total ?? null,
          },
        }),
      ])
    }
  }

  revalidatePath('/sales/pipeline')
  revalidatePath(`/sales/deals/${dealId}`)
  revalidatePath('/admin/jobs')
}

export async function markDealLost(dealId: string, lossReason: string) {
  await prisma.deal.update({
    where: { id: dealId },
    data: { status: 'lost', lossReason },
  })
  revalidatePath('/sales/pipeline')
  revalidatePath(`/sales/deals/${dealId}`)
}

export async function createQuote(
  dealId: string,
  data: {
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>
    subtotal: number
    tax: number
    total: number
    notes?: string
    submit: boolean
    generatePdf?: boolean
  },
) {
  const agg = await prisma.quote.aggregate({
    where: { dealId },
    _max: { version: true },
  })
  const version = (agg._max.version ?? 0) + 1

  const jar = await cookies()
  const role = jar.get('user-role')?.value
  const isContractorRole = role === 'CONTRACTOR'
  const submitStatus = !data.submit ? 'draft' : isContractorRole ? 'pending_review' : 'submitted'

  let pdfUrl: string | null = null
  if (data.generatePdf || data.submit) {
    pdfUrl = await generateAndUploadInvoicePdf(dealId, version, data.lineItems, data.subtotal, data.tax, data.total, data.notes)
  }

  await prisma.quote.create({
    data: {
      dealId,
      version,
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      notes: data.notes ?? null,
      status: submitStatus,
      submittedAt: data.submit ? new Date() : null,
      pdfUrl,
    },
  })
  if (data.submit && !isContractorRole) {
    await maybeSendQuoteEmail(dealId, data.lineItems, data.subtotal, data.tax, data.total, data.notes, version)
    const QUOTE_SENT_IDX = STAGE_ORDER.indexOf('QUOTE_SENT')
    const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { currentStage: true } })
    if (deal && STAGE_ORDER.indexOf(deal.currentStage) < QUOTE_SENT_IDX) {
      await prisma.deal.update({ where: { id: dealId }, data: { currentStage: 'QUOTE_SENT' } })
    }
  }
  if (data.submit && isContractorRole) {
    notifyStaffQuoteSubmitted(dealId, data.total)
  }
  revalidatePath(`/sales/deals/${dealId}`)
  revalidatePath(`/contractor/jobs`)
  revalidatePath('/sales/pipeline')
  revalidatePath('/admin/sales')
  return { pdfUrl }
}

export async function updateQuote(
  quoteId: string,
  dealId: string,
  data: {
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>
    subtotal: number
    tax: number
    total: number
    notes?: string
    submit: boolean
    generatePdf?: boolean
  },
) {
  const jar2 = await cookies()
  const role2 = jar2.get('user-role')?.value
  const isContractorRole2 = role2 === 'CONTRACTOR'

  let pdfUrl: string | undefined
  if (data.generatePdf || data.submit) {
    const existing = await prisma.quote.findUnique({ where: { id: quoteId }, select: { version: true } })
    if (existing) {
      const url = await generateAndUploadInvoicePdf(dealId, existing.version, data.lineItems, data.subtotal, data.tax, data.total, data.notes)
      if (url) pdfUrl = url
    }
  }

  const submitStatus = !data.submit ? 'draft' : isContractorRole2 ? 'pending_review' : 'submitted'
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: {
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      notes: data.notes ?? null,
      status: submitStatus,
      submittedAt: data.submit ? new Date() : null,
      ...(pdfUrl ? { pdfUrl } : {}),
    },
  })
  if (data.submit && !isContractorRole2) {
    await maybeSendQuoteEmail(dealId, data.lineItems, data.subtotal, data.tax, data.total, data.notes, quote.version)
    const QUOTE_SENT_IDX = STAGE_ORDER.indexOf('QUOTE_SENT')
    const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { currentStage: true } })
    if (deal && STAGE_ORDER.indexOf(deal.currentStage) < QUOTE_SENT_IDX) {
      await prisma.deal.update({ where: { id: dealId }, data: { currentStage: 'QUOTE_SENT' } })
    }
  }
  if (data.submit && isContractorRole2) {
    notifyStaffQuoteSubmitted(dealId, data.total)
  }
  revalidatePath(`/sales/deals/${dealId}`)
  revalidatePath('/sales/pipeline')
  revalidatePath('/admin/sales')
  return { pdfUrl }
}


function notifyStaffQuoteSubmitted(dealId: string, totalAmount: number | null) {
  ;(async () => {
    try {
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        select: {
          projectType: true,
          projectName: true,
          ownerId: true,
          lead: { select: { jobs: { where: { companyId: { not: null } }, take: 1, select: { company: { select: { name: true } } } } } },
        },
      })

      let recipientEmail: string | null = null
      let recipientName: string | null = null

      if (deal?.ownerId) {
        const owner = await prisma.user.findUnique({
          where: { id: deal.ownerId },
          select: { email: true, firstName: true },
        })
        recipientEmail = owner?.email ?? null
        recipientName = owner?.firstName ?? null
      }
      if (!recipientEmail) {
        const lastStaff = await prisma.dealComment.findFirst({
          where: { dealId, author: { role: { in: ['SALES', 'ADMIN'] as never[] } } },
          orderBy: { createdAt: 'desc' },
          select: { author: { select: { email: true, firstName: true } } },
        })
        recipientEmail = lastStaff?.author.email ?? null
        recipientName = lastStaff?.author.firstName ?? null
      }
      if (!recipientEmail) {
        const admin = await prisma.user.findFirst({
          where: { role: 'ADMIN' as never },
          select: { email: true, firstName: true },
        })
        recipientEmail = admin?.email ?? null
        recipientName = admin?.firstName ?? null
      }

      if (recipientEmail) {
        const headersList = await headers()
        const origin = headersList.get('origin') ?? 'https://constructionmarket.ca'
        const dealUrl = `${origin}/sales/deals/${dealId}/estimation`
        const projectLabel = deal?.projectType || deal?.projectName || 'a project'
        const contractorName = deal?.lead.jobs[0]?.company?.name || 'The contractor'
        const total = totalAmount ? `$${totalAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}` : null

        await sendMail({
          to: recipientEmail,
          subject: `Quote submitted — ${projectLabel}`,
          text: `Hi ${recipientName ?? 'there'}, ${contractorName} has submitted a quote for ${projectLabel}. View it at ${dealUrl}`,
          html: quoteSubmittedEmailHtml({ firstName: recipientName ?? 'there', contractorName, projectLabel, total, dealUrl }),
        })
      }
    } catch (e) {
      console.error('[quote submitted email]', e)
    }
  })()
}

function quoteSubmittedEmailHtml({ firstName, contractorName, projectLabel, total, dealUrl }: {
  firstName: string
  contractorName: string
  projectLabel: string
  total: string | null
  dealUrl: string
}): string {
  const totalRow = total
    ? `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;border-radius:4px;margin:0 0 24px 0;"><tr><td style="padding:16px 20px;font-family:Arial,sans-serif;border-left:2px solid #00e5ff;"><p style="margin:0 0 4px 0;color:#aaaaaa;font-size:12px;font-family:Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;">Quote total</p><p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;font-family:Arial,sans-serif;">${total}</p></td></tr></table>`
    : ''
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Quote submitted – Construction Market</title></head><body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;"><tr><td align="center" style="padding:20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;"><tr><td style="background-color:#0a0a0a;padding:30px 40px 20px 40px;text-align:left;"><p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;">Hi ${firstName},</p><p style="margin:0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.5;">A contractor has submitted a quote for your review.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:10px 40px 30px 40px;text-align:center;"><h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:bold;font-family:Arial,sans-serif;">Quote Submitted</h1><p style="margin:0;color:#00e5ff;font-size:13px;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">${projectLabel}</p></td></tr><tr><td style="background-color:#13131f;padding:30px 40px;border-left:3px solid #00e5ff;"><p style="margin:0 0 20px 0;color:#cccccc;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;"><strong style="color:#ffffff;">${contractorName}</strong> has submitted a quote and it's ready for your review.</p>${totalRow}<table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center"><a href="${dealUrl}" style="display:block;background-color:#00e5ff;color:#000000;text-decoration:none;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;padding:14px 20px;text-align:center;border-radius:4px;">Review Quote →</a></td></tr></table></td></tr><tr><td style="background-color:#0a0a0a;padding:24px 40px 30px 40px;border-top:1px solid #222222;"><p style="margin:0 0 4px 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;">Best regards,</p><p style="margin:0 0 2px 0;color:#ffffff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;">The Construction Market team</p><p style="margin:0;color:#888888;font-size:12px;font-family:Arial,sans-serif;">build@constructionmarket.ca &nbsp;|&nbsp; 437-450-3116 &nbsp;|&nbsp; constructionmarket.ca</p></td></tr></table></td></tr></table></body></html>`
}

export async function deleteQuote(quoteId: string, dealId: string) {
  await prisma.quote.delete({ where: { id: quoteId } })
  revalidatePath(`/sales/deals/${dealId}`)
  revalidatePath(`/contractor/jobs`)
  revalidatePath('/sales/pipeline')
  revalidatePath('/admin/sales')
}

export async function acceptQuote(quoteId: string, dealId: string) {
  await requireSalesOrAdmin()
  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'accepted' },
  })
  if (quote.total != null) {
    await prisma.deal.update({
      where: { id: dealId },
      data: { estimatedValue: quote.total },
    })
  }

  // For referral deals: the contractor has already been sent an offer (OFFER_SENT).
  // Accepting their quote moves the job to ASSIGNED.
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { lead: { select: { source: true, jobs: { select: { id: true, companyId: true, status: true } } } } },
  })
  const TERMINAL = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CANCELLED']
  const activeJob = deal?.lead.jobs.find(j => j.companyId && !TERMINAL.includes(j.status as string))
  if (activeJob) {
    await prisma.$transaction([
      prisma.job.update({
        where: { id: activeJob.id },
        data: { status: 'ASSIGNED' as never, priceType: 'fixed', priceFixed: quote.total },
      }),
      prisma.jobOffer.updateMany({
        where: { jobId: activeJob.id, status: 'pending' },
        data: { status: 'accepted', respondedAt: new Date() },
      }),
    ])
    revalidatePath('/sales/jobs')
    revalidatePath('/contractor/jobs')
  }

  revalidatePath(`/sales/deals/${dealId}`)
  revalidatePath(`/admin/sales/deals/${dealId}`)
}
