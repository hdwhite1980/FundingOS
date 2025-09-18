import { NextResponse } from 'next/server'
import { findUserByEmail, verifyCode } from '@/lib/passwordReset'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json()
    if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 })
    const user = await findUserByEmail(email)
    if (!user) return NextResponse.json({ valid: false })
    const valid = await verifyCode(user.id, code)
    console.log('[password_reset:verify] code_checked', { userId: user.id, valid })
    return NextResponse.json({ valid })
  } catch (e: any) {
    console.error('password reset verify error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
