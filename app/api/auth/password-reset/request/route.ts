import { NextResponse } from 'next/server'
import { findUserByEmail, generateSixDigitCode, storeResetCode, sendResetEmail } from '@/lib/passwordReset'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
    const user = await findUserByEmail(email)
    if (!user) {
      // Obfuscate existence
      console.log('[password_reset:request] user_not_found_obfuscated', { email })
      return NextResponse.json({ success: true })
    }
    const code = generateSixDigitCode()
    await storeResetCode(user.id, code)
    console.log('[password_reset:request] code_generated', { userId: user.id })
    await sendResetEmail(email, code)
    console.log('[password_reset:request] email_dispatched_attempt', { userId: user.id })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('password reset request error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
