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
}) {
  const recipient = process.env.RESEND_TO_OVERRIDE || to
  const from = process.env.RESEND_FROM || 'onboarding@resend.dev'

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

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto;padding:32px 16px;">

  <p style="font-size:14px;color:#666;margin-bottom:24px;">Blue Jays On Air</p>

  <h1 style="font-size:22px;font-weight:700;margin-bottom:4px;">Quote #${quoteVersion}</h1>
  <p style="font-size:14px;color:#555;margin-bottom:24px;">${projectName}</p>

  <p style="font-size:14px;margin-bottom:24px;">Hi ${clientName},<br><br>
  Please find your quote below. If you have any questions, feel free to reach out.</p>

  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
    <thead>
      <tr style="background:#f8f8f8;">
        <th style="padding:10px 12px;text-align:left;font-weight:600;color:#555;">Description</th>
        <th style="padding:10px 12px;text-align:center;font-weight:600;color:#555;">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-weight:600;color:#555;">Unit Price</th>
        <th style="padding:10px 12px;text-align:right;font-weight:600;color:#555;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <table style="width:200px;margin-left:auto;font-size:14px;margin-bottom:24px;">
    <tr>
      <td style="padding:4px 0;color:#555;">Subtotal</td>
      <td style="padding:4px 0;text-align:right;">${fmt(subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:#555;">Tax</td>
      <td style="padding:4px 0;text-align:right;">${fmt(tax)}</td>
    </tr>
    <tr style="font-weight:700;font-size:16px;border-top:2px solid #1a1a1a;">
      <td style="padding:8px 0;">Total</td>
      <td style="padding:8px 0;text-align:right;">${fmt(total)}</td>
    </tr>
  </table>

  ${notes ? `<p style="font-size:13px;color:#555;background:#f8f8f8;padding:12px;border-radius:6px;">${notes}</p>` : ''}

  <p style="font-size:12px;color:#aaa;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">
    This quote was prepared by Blue Jays On Air.
  </p>

</body>
</html>`

  await resend.emails.send({
    from,
    to: recipient,
    subject: `Quote #${quoteVersion} — ${projectName}`,
    html,
  })
}
