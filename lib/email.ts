import sgMail from '@sendgrid/mail'

const sendgridKey = process.env.SENDGRID_API_KEY
const defaultFrom = process.env.EMAIL_FROM || 'no-reply@wali-os.local'

if (sendgridKey) {
  sgMail.setApiKey(sendgridKey)
}

export interface EmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  category?: string
}

export async function sendEmail(params: EmailParams) {
  const { to, subject, html, text, from, category } = params
  if (!sendgridKey) {
    console.warn('[email] SENDGRID_API_KEY missing; logging email instead.')
    console.log({ to, subject, html })
    return { mocked: true }
  }
  const msg: any = {
    to,
    from: from || defaultFrom,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' ')
  }
  if (category) msg.categories = [category]
  try {
    const res = await sgMail.send(msg)
    return { id: res[0]?.headers['x-message-id'] || null }
  } catch (e: any) {
    console.error('SendGrid send error', e?.response?.body || e)
    throw new Error('EMAIL_SEND_FAILED')
  }
}

export async function sendPasswordResetEmail(email: string, code: string) {
  const html = `<p>Your password reset code:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>Expires in 10 minutes.</p>`
  return sendEmail({ to: email, subject: 'Your Password Reset Code', html, category: 'password_reset' })
}

// Placeholder for AI-related notifications (summaries, analysis ready, etc.)
export async function sendAIAnalysisNotification(email: string, subject: string, body: string) {
  const html = `<p>${body}</p>`
  return sendEmail({ to: email, subject, html, category: 'ai_notification' })
}
