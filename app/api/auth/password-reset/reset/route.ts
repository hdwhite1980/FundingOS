import { NextResponse } from 'next/server'
import { findUserByEmail, verifyCode, consumeCode, updateUserPassword } from '@/lib/passwordReset'

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json()
    if (!email || !code || !newPassword) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (newPassword.length < 8) return NextResponse.json({ error: 'Password too short' }, { status: 400 })
    const user = await findUserByEmail(email)
    if (!user) return NextResponse.json({ error: 'Invalid code or user' }, { status: 400 })
    const ok = await verifyCode(user.id, code)
    if (!ok) return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    const consumed = await consumeCode(user.id, code)
    if (!consumed) return NextResponse.json({ error: 'Code already used or expired' }, { status: 400 })
    await updateUserPassword(user.id, newPassword)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('password reset reset error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
