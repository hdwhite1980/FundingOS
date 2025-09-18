// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body
    return NextResponse.json({
      error: 'Deprecated password reset route. Use /api/auth/password-reset/request, /verify, /reset endpoints.',
      receivedAction: action
    }, { status: 410 })

  } catch (error) {
    console.error('Password reset API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}