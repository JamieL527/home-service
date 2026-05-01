'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { sendQuoteEmail } from '@/lib/email'

const STAGE_ORDER = ['NEW_OPPORTUNITY', 'DISCOVERY', 'ESTIMATION', 'QUOTE_SENT', 'NEGOTIATION']

function getNextStage(current: string): string | null {
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1]
}

export async function moveDealToNextStage(dealId: string) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } })
  if (!deal) return
  const next = getNextStage(deal.currentStage)
  if (!next) return
  await prisma.deal.update({ where: { id: dealId }, data: { currentStage: next } })
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
      quotes: {
        where: { status: 'accepted' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!deal) return

  const acceptedQuote = deal.quotes[0]

  await prisma.$transaction([
    prisma.deal.update({
      where: { id: dealId },
      data: { status: 'won' },
    }),
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
  },
) {
  const agg = await prisma.quote.aggregate({
    where: { dealId },
    _max: { version: true },
  })
  const version = (agg._max.version ?? 0) + 1

  await prisma.quote.create({
    data: {
      dealId,
      version,
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      notes: data.notes ?? null,
      status: data.submit ? 'submitted' : 'draft',
      submittedAt: data.submit ? new Date() : null,
    },
  })
  revalidatePath(`/sales/deals/${dealId}`)
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
  },
) {
  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      notes: data.notes ?? null,
      status: data.submit ? 'submitted' : 'draft',
      submittedAt: data.submit ? new Date() : null,
    },
  })
  revalidatePath(`/sales/deals/${dealId}`)
}

export async function submitDraftQuote(quoteId: string, dealId: string) {
  const [quote, deal] = await Promise.all([
    prisma.quote.findUnique({ where: { id: quoteId } }),
    prisma.deal.findUnique({
      where: { id: dealId },
      include: { lead: { include: { contacts: true } } },
    }),
  ])

  if (!quote || !deal) return

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'submitted', submittedAt: new Date() },
  })

  // Find a contact email — fall back to RESEND_TO_OVERRIDE if none on the lead
  const contactEmail = deal.lead.contacts.find(c => c.email)?.email
  const toEmail = contactEmail || process.env.RESEND_TO_OVERRIDE || ''

  if (toEmail) {
    const lineItems = (quote.lineItems as Array<{ description: string; quantity: number; unitPrice: number }>) ?? []
    await sendQuoteEmail({
      to: toEmail,
      projectName: deal.projectName || deal.lead.address,
      clientName: deal.clientName || deal.lead.contacts[0]?.name || 'Valued Client',
      quoteVersion: quote.version,
      lineItems,
      subtotal: quote.subtotal ?? 0,
      tax: quote.tax ?? 0,
      total: quote.total ?? 0,
      notes: quote.notes,
    }).catch(err => {
      // don't block the status update if email fails
      console.error('Failed to send quote email:', err)
    })
  }

  revalidatePath(`/sales/deals/${dealId}`)
}

export async function acceptQuote(quoteId: string, dealId: string) {
  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'accepted' },
  })
  revalidatePath(`/sales/deals/${dealId}`)
}
