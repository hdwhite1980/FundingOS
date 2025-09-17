// app/api/auth/2fa/setup-new/route.js
// Alternative 2FA setup endpoint using service role authentication
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
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID required',
        debug: { 
          message: 'Frontend must provide authenticated user ID for 2FA setup',
          environment: 'vercel-production' 
        }
      }, { status: 400 })
    }

    const supabase = await getSupabaseServiceClient()

    // Get user profile to check if 2FA is already enabled
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, two_factor_enabled, two_factor_secret')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching user profile for 2FA setup:', profileError)
      return NextResponse.json({ 
        error: 'Failed to get user profile',
        debug: { profileError: profileError.message }
      }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ 
        error: 'User profile not found',
        debug: { userId }
      }, { status: 404 })
    }

    if (profile.two_factor_enabled) {
      return NextResponse.json({ 
        error: '2FA is already enabled for this user',
        debug: { already_enabled: true }
      }, { status: 400 })
    }

    // Generate a new secret for 2FA
    const crypto = require('crypto')
    
    // Create a base32 secret (Google Authenticator compatible)
    // Node.js doesn't support base32 natively, so we'll create a custom implementation
    const generateBase32Secret = (length = 32) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
      let result = ''
      const bytes = crypto.randomBytes(length)
      
      for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length]
      }
      
      return result
    }
    
    const secret = generateBase32Secret(32)
    
    // Get user email for QR code
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Failed to get user details',
        debug: { userError: userError?.message }
      }, { status: 500 })
    }

    // Create QR code URL (we can use a simple format that works with Google Authenticator)
    const serviceName = 'FundingOS'
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(serviceName)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(serviceName)}`

    // Store the secret temporarily (not enabled yet)
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        two_factor_secret: secret,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error storing 2FA secret:', updateError)
      return NextResponse.json({ 
        error: 'Failed to store 2FA secret',
        debug: { updateError: updateError.message }
      }, { status: 500 })
    }

    return NextResponse.json({
      secret,
      qr_code_url: qrCodeUrl,
      user: { id: userId, email: user.email },
      authMethod: 'service_role_2fa_setup'
    })

  } catch (error) {
    console.error('2FA setup API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { error: error.message }
    }, { status: 500 })
  }
}