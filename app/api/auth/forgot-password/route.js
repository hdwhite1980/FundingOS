// app/api/auth/forgot-password/route.js
import { NextResponse } from 'next/server'
// Legacy route retained for backward compatibility; now delegates to new code-based flow or returns deprecation message.

export async function POST(request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // New flow: instruct client to call /api/auth/password-reset/request instead
    return NextResponse.json({
      success: true,
      deprecated: true,
      message: 'Legacy endpoint deprecated. Use the new code-based password reset flow.'
    })

  } catch (error) {
    console.error('Forgot password API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}