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

export async function sendAIAnalysisNotification(email: string, projectName: string, insights: string[]) {
  const top = insights.slice(0, 5)
  const html = `<h2>Analysis Ready: ${projectName}</h2><ul>${top.map(i => `<li>${i}</li>`).join('')}</ul><p>Log in for full details.</p>`
  return sendEmail({ to: email, subject: `AI Analysis Complete: ${projectName}`, html, category: 'ai_analysis' })
}

export interface MatchSummary { opportunityTitle: string; score: number; factors: string[] }
export async function sendNewMatchesNotification(email: string, projectName: string, matches: MatchSummary[]) {
  const top = matches.slice(0, 5)
  const html = `<h2>New Matches for ${projectName}</h2>${top.map(m => `<div style='margin-bottom:8px;'><strong>${m.opportunityTitle}</strong> – Score ${(m.score).toFixed(0)}<br/><small>${m.factors.slice(0, 3).join('; ')}</small></div>`).join('')}<p>View dashboard for full list.</p>`
  return sendEmail({ to: email, subject: `New Funding Matches: ${projectName}`, html, category: 'ai_matches' })
}
