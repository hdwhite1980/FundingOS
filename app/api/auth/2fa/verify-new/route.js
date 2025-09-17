// app/api/auth/2fa/verify-new/route.js
// Alternative 2FA verify endpoint using service role authentication
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request) {
  try {
    const { userId, token, secret } = await request.json()

    if (!userId || !token || !secret) {
      return NextResponse.json({ 
        error: 'User ID, token, and secret are required',
        debug: { 
          hasUserId: !!userId,
          hasToken: !!token,
          hasSecret: !!secret
        }
      }, { status: 400 })
    }

    const supabase = await getSupabaseServiceClient()

    // Get user profile to verify the secret matches
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, two_factor_secret, two_factor_enabled')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching user profile for 2FA verify:', profileError)
      return NextResponse.json({ 
        error: 'Failed to get user profile',
        debug: { profileError: profileError.message }
      }, { status: 500 })
    }

    if (!profile || profile.two_factor_secret !== secret) {
      return NextResponse.json({ 
        error: 'Invalid secret or user not found',
        debug: { hasProfile: !!profile }
      }, { status: 400 })
    }

    // Here you would normally verify the TOTP token against the secret
    // For now, let's simulate this verification (in production, use a library like 'otplib')
    const isValidToken = token && token.length === 6 && /^\d{6}$/.test(token)
    
    if (!isValidToken) {
      return NextResponse.json({ 
        error: 'Invalid verification code format',
        debug: { tokenFormat: 'Expected 6 digits' }
      }, { status: 400 })
    }

    // Generate backup codes
    const crypto = require('crypto')
    const backupCodes = Array.from({ length: 8 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    )

    // Enable 2FA and store backup codes
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        two_factor_enabled: true,
        two_factor_backup_codes: JSON.stringify(backupCodes),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error enabling 2FA:', updateError)
      return NextResponse.json({ 
        error: 'Failed to enable 2FA',
        debug: { updateError: updateError.message }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      backup_codes: backupCodes,
      user: { id: userId },
      authMethod: 'service_role_2fa_verify'
    })

  } catch (error) {
    console.error('2FA verify API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { error: error.message }
    }, { status: 500 })
  }
}