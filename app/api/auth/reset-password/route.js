// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, code, newPassword, action } = body


    switch (action) {
      case 'request': {
        if (!email) {
          return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }
        // Build robust redirect URL
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
          || (request.headers.get('origin') && `${request.headers.get('origin')}`)
          || (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`)
          || 'http://localhost:3000'
        const redirectTo = `${siteUrl.replace(/\/$/, '')}/auth/reset-password`

        // Send password reset email with code
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
          redirectTo
        })

        if (error) {
          console.error('Password reset request error:', error)
          return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Password reset email sent. Check your inbox for instructions.' 
        })
      }

      case 'verify': {
        // Verify reset code and update password
        if (!code || !newPassword) {
          return NextResponse.json({ error: 'Code and new password are required' }, { status: 400 })
        }

        if (newPassword.length < 6) {
          return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
        }

        // Create a client with the reset token to update the password
        const resetClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )

        // Set the session with the reset token
        const { data: sessionData, error: sessionError } = await resetClient.auth.setSession({
          access_token: code,
          refresh_token: '' // Not needed for password reset
        })

        if (sessionError) {
          console.error('Session error:', sessionError)
          return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 })
        }

        // Update the password
        const { error: updateError } = await resetClient.auth.updateUser({
          password: newPassword
        })

        if (updateError) {
          console.error('Password update error:', updateError)
          return NextResponse.json({ error: updateError.message }, { status: 400 })
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Password updated successfully. You can now sign in with your new password.' 
        })
      }

      case 'exchange': {
        // Exchange URL hash for access token (for URL-based reset flow)
        if (!code) {
          return NextResponse.json({ error: 'Reset code is required' }, { status: 400 })
        }

        const resetClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )

        try {
          // Parse the hash fragment which contains access_token and refresh_token
          const params = new URLSearchParams(code)
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (!accessToken) {
            return NextResponse.json({ error: 'Invalid reset link format' }, { status: 400 })
          }

          // Verify the tokens by setting the session
          const { data, error } = await resetClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })

          if (error) {
            console.error('Token validation error:', error)
            return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
          }

          return NextResponse.json({ 
            success: true, 
            access_token: accessToken,
            user: data.user,
            message: 'Reset link verified. You can now set a new password.' 
          })
        } catch (parseError) {
          console.error('Token parsing error:', parseError)
          return NextResponse.json({ error: 'Invalid reset link format' }, { status: 400 })
        }
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: request, verify, or exchange' }, { status: 400 })
    }

  } catch (error) {
    console.error('Password reset API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}