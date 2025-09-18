import sgMail from '@sendgrid/mail'
import fs from 'fs'
import path from 'path'

const sendgridKey = process.env.SENDGRID_API_KEY
const defaultFrom = process.env.EMAIL_FROM || 'no-reply@wali-os.local'
const passwordResetTemplateId = process.env.SENDGRID_PASSWORD_RESET_TEMPLATE_ID // optional dynamic template

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

function loadTemplate(name: string) {
  try {
    const p = path.join(process.cwd(), 'lib', 'emailTemplates', name)
    return fs.readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

function render(template: string, vars: Record<string, string | number>) {
  return Object.keys(vars).reduce(
    (acc, k) => acc.replace(new RegExp(`{{${k}}}`, 'g'), String(vars[k])),
    template
  )
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

export async function sendPasswordResetEmail(
  email: string,
  code: string,
  { firstName = 'there', ttlMinutes = 15 }: { firstName?: string; ttlMinutes?: number } = {}
) {
  // Prefer SendGrid dynamic template if configured
  if (sendgridKey && passwordResetTemplateId) {
    try {
      const msg: any = {
        to: email,
        from: defaultFrom,
        templateId: passwordResetTemplateId,
        dynamicTemplateData: {
          first_name: firstName,
            email_address: email,
            reset_code: code,
            ttl_minutes: ttlMinutes
        },
        categories: ['password_reset']
      }
      const res = await sgMail.send(msg)
      return { id: res[0]?.headers['x-message-id'] || null }
    } catch (e: any) {
      console.warn('Dynamic template send failed, falling back to inline HTML', e?.response?.body || e)
      // Fall through to inline template fallback
    }
  }
  const base = loadTemplate('passwordReset.html')
  const html = base
    ? render(base, { first_name: firstName, email_address: email, reset_code: code, ttl_minutes: ttlMinutes })
    : `<p>Your password reset code:</p><p><strong>${code}</strong></p><p>This code expires in ${ttlMinutes} minutes.</p>`
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
