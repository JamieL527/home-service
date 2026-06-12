import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

type LineItem = { description: string; quantity: number; unitPrice: number }

export async function sendQuoteEmail({
  to,
  projectName,
  clientName,
  quoteVersion,
  lineItems,
  subtotal,
  tax,
  total,
  notes,
  pdfBuffer,
}: {
  to: string
  projectName: string
  clientName: string
  quoteVersion: number
  lineItems: LineItem[]
  subtotal: number
  tax: number
  total: number
  notes?: string | null
  pdfBuffer?: Buffer | null
}) {
  const recipient = process.env.RESEND_TO_OVERRIDE || to
  const from = process.env.RESEND_FROM ? `Construction Market <${process.env.RESEND_FROM}>` : 'onboarding@resend.dev'

  const fmt = (n: number) =>
    '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const itemRows = lineItems
    .map(
      item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(item.unitPrice)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(item.quantity * item.unitPrice)}</td>
      </tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Quote #${quoteVersion} – Construction Market</title></head><body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;"><tr><td align="center" style="padding:20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;"><tr><td style="background-color:#0a0a0a;padding:30px 40px 20px 40px;text-align:left;"><p style="margin:0 0 4px 0;color:#ffffff;font-size:13px;font-family:Arial,sans-serif;">Hi ${clientName},</p><p style="margin:0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.5;">Please find your quote below. If you have any questions, feel free to reach out.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:10px 40px 30px 40px;text-align:center;"><h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:bold;font-family:Arial,sans-serif;">Quote #${quoteVersion}</h1><p style="margin:0;color:#00e5ff;font-size:13px;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">${projectName}</p></td></tr><tr><td style="background-color:#ffffff;padding:30px 40px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px;margin-bottom:24px;"><thead><tr style="background-color:#f4f4f4;"><th style="padding:10px 12px;text-align:left;font-weight:600;color:#555555;font-family:Arial,sans-serif;border-bottom:2px solid #e5e5e5;">Description</th><th style="padding:10px 12px;text-align:center;font-weight:600;color:#555555;font-family:Arial,sans-serif;border-bottom:2px solid #e5e5e5;">Qty</th><th style="padding:10px 12px;text-align:right;font-weight:600;color:#555555;font-family:Arial,sans-serif;border-bottom:2px solid #e5e5e5;">Unit Price</th><th style="padding:10px 12px;text-align:right;font-weight:600;color:#555555;font-family:Arial,sans-serif;border-bottom:2px solid #e5e5e5;">Amount</th></tr></thead><tbody>${itemRows}</tbody></table><table cellpadding="0" cellspacing="0" border="0" style="width:220px;margin-left:auto;font-size:14px;font-family:Arial,sans-serif;margin-bottom:24px;"><tr><td style="padding:5px 0;color:#555555;">Subtotal</td><td style="padding:5px 0;text-align:right;color:#1a1a1a;">${fmt(subtotal)}</td></tr><tr><td style="padding:5px 0;color:#555555;">Tax</td><td style="padding:5px 0;text-align:right;color:#1a1a1a;">${fmt(tax)}</td></tr><tr><td colspan="2" style="padding:0;border-top:2px solid #0a0a0a;"></td></tr><tr><td style="padding:8px 0 0 0;font-weight:bold;font-size:16px;color:#0a0a0a;">Total</td><td style="padding:8px 0 0 0;text-align:right;font-weight:bold;font-size:16px;color:#0a0a0a;">${fmt(total)}</td></tr></table>${notes ? `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:8px;"><tr><td style="background-color:#f8f8f8;border-left:3px solid #00e5ff;padding:12px 16px;font-size:13px;color:#555555;font-family:Arial,sans-serif;line-height:1.6;">${notes}</td></tr></table>` : ''}</td></tr><tr><td style="background-color:#0a0a0a;padding:24px 40px 30px 40px;border-top:1px solid #222222;"><p style="margin:0 0 4px 0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;">Best regards,</p><p style="margin:0 0 2px 0;color:#ffffff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;">The Construction Market team</p><p style="margin:0;color:#888888;font-size:12px;font-family:Arial,sans-serif;">build@constructionmarket.ca &nbsp;|&nbsp; 437-450-3116 &nbsp;|&nbsp; constructionmarket.ca</p></td></tr></table></td></tr></table></body></html>`

  await resend.emails.send({
    from,
    to: recipient,
    subject: `Quote #${quoteVersion} — ${projectName}`,
    html,
    ...(pdfBuffer ? {
      attachments: [{
        filename: `Invoice-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-v${quoteVersion}.pdf`,
        content: pdfBuffer,
      }],
    } : {}),
  })
}

export async function sendCommentNotificationEmail({
  to,
  authorName,
  content,
  projectName,
  dealUrl,
}: {
  to: string
  authorName: string
  content: string
  projectName: string
  dealUrl: string
}) {
  const recipient = process.env.RESEND_TO_OVERRIDE || to
  const from = process.env.RESEND_FROM ? `Construction Market <${process.env.RESEND_FROM}>` : 'onboarding@resend.dev'

  await resend.emails.send({
    from,
    to: recipient,
    subject: `New comment on ${projectName}`,
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New comment – Construction Market</title></head><body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;"><tr><td align="center" style="padding:20px 0;"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;"><tr><td style="background-color:#0a0a0a;padding:30px 40px 20px 40px;text-align:left;"><p style="margin:0;color:#aaaaaa;font-size:13px;font-family:Arial,sans-serif;line-height:1.5;">New activity on your project.</p></td></tr><tr><td style="background-color:#0a0a0a;padding:10px 40px 30px 40px;text-align:center;"><h1 style="margin:0 0 8px 0;color:#ffffff;font-size:26px;font-weight:bold;font-family:Arial,sans-serif;">New Comment</h1><p style="margin:0;color:#00e5ff;font-size:13px;font-family:Arial,sans-serif;letter-spacing:1px;text-transform:uppercase;">${projectName}</p></td></tr><tr><td style="background-color:#13131f;padding:30px 40px;border-left:3px solid #00e5ff;"><p style="margin:0 0 6px 0;color:#ffffff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;">${authorName}</p><table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a0a0a;border-radius:4px;margin:0 0 24px 0;"><tr><td style="padding:16px 20px;color:#cccccc;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;border-left:2px solid #00e5ff;">${content}</td></tr></table><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center"><a href="${dealUrl}" style="display:block;background-color:#00e5ff;color:#000000;text-decoration:none;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;padding:14px 20px;text-align:center;border-radius:4px;">View Conversation →</a></td></tr></table></td></tr><tr><td style="background-color:#0a0a0a;padding:24px 40px 30px 40px;border-top:1px solid #222222;"><p style="margin:0 0 4px 0;color:#888888;font-size:12px;font-family:Arial,sans-serif;">You received this because you are involved in this project.</p><p style="margin:8px 0 0 0;color:#888888;font-size:12px;font-family:Arial,sans-serif;">build@constructionmarket.ca &nbsp;|&nbsp; 437-450-3116 &nbsp;|&nbsp; constructionmarket.ca</p></td></tr></table></td></tr></table></body></html>`,
  })
}
