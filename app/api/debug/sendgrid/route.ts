import { NextResponse } from 'next/server'
import { sendEmail, sendPasswordResetEmail } from '@/lib/email'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const to = url.searchParams.get('to')
  const mode = url.searchParams.get('mode') || 'basic'
  const testCode = url.searchParams.get('code') || '123456'

  if (!to) {
    return NextResponse.json({ error: 'Provide ?to=email@example.com' }, { status: 400 })
  }

  const envReport = {
    SENDGRID_API_KEY_present: !!process.env.SENDGRID_API_KEY,
    SENDGRID_PASSWORD_RESET_TEMPLATE_ID_present: !!process.env.SENDGRID_PASSWORD_RESET_TEMPLATE_ID,
    EMAIL_FROM: process.env.EMAIL_FROM || null
  }

  try {
    let result: any
    if (mode === 'password') {
      result = await sendPasswordResetEmail(to, testCode, { firstName: 'Debug', ttlMinutes: 15 })
    } else {
      result = await sendEmail({ to, subject: 'SendGrid Debug Test', html: '<p>Hello from debug route.</p>' })
    }
    return NextResponse.json({ ok: true, mode, result, envReport })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'send_failed', envReport }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}