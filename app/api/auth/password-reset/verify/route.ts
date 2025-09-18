import { NextResponse } from 'next/server'
import { findUserByEmail, verifyCode } from '@/lib/passwordReset'

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json()
    if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 })
    const user = await findUserByEmail(email)
    if (!user) return NextResponse.json({ valid: false })
    const valid = await verifyCode(user.id, code)
    return NextResponse.json({ valid })
  } catch (e: any) {
    console.error('password reset verify error', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
