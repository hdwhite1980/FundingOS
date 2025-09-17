// app/api/auth/forgot-password/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

    // Check if user exists first (optional - you might want to always return success for security)
    const { data: userCheck, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('email')
      .eq('email', email)
      .single()

    // Build robust redirect URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (request.headers.get('origin') && `${request.headers.get('origin')}`)
      || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
      || 'http://localhost:3000'

    const redirectTo = `${siteUrl.replace(/\/$/, '')}/auth/reset-password`

    // Send password reset email
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo
    })

    if (error) {
      console.error('Forgot password error:', error)
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with that email exists, we have sent password reset instructions.' 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If an account with that email exists, we have sent password reset instructions.' 
    })

  } catch (error) {
    console.error('Forgot password API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}