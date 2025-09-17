// app/api/auth/2fa/setup/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a secret for the user
    const secret = speakeasy.generateSecret({
      name: `FundingOS (${user.email})`,
      issuer: 'FundingOS'
    })

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    // Store the temporary secret in the database (before verification)
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        two_factor_secret_temp: secret.base32,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error storing temporary 2FA secret:', updateError)
      return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 })
    }

    return NextResponse.json({
      secret: secret.base32,
      qr_code: qrCodeUrl
    })

  } catch (error) {
    console.error('2FA setup API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}