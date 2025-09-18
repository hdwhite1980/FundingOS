import { NextResponse } from 'next/server'
import { findUserByEmail, generateSixDigitCode, storeResetCode, sendResetEmail } from '@/lib/passwordReset'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
    const user = await findUserByEmail(email)
    if (!user) {
      // Obfuscate existence
      return NextResponse.json({ success: true })
    }
    const code = generateSixDigitCode()
    await storeResetCode(user.id, code)
    await sendResetEmail(email, code)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('password reset request error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
