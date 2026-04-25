import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMail({
  to,
  subject,
  text,
}: {
  to: string
  subject: string
  text: string
}) {
  const recipient = process.env.RESEND_TO_OVERRIDE ?? to
  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? 'onboarding@resend.dev',
    to: recipient,
    subject,
    text,
  })
  if (error) {
    console.error('[mailer] Resend error:', error)
  } else {
    console.log('[mailer] Sent email id:', data?.id, '→', to)
  }
}
