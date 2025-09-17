export const dynamic = 'force-dynamic'
// app/api/auth/2fa/verify/route.js
import { NextResponse } from 'next/server'
import { getVercelAuth } from '../../../../../lib/vercelAuthHelper'
import speakeasy from 'speakeasy'
import crypto from 'crypto'

function generateBackupCodes() {
  const codes = []
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code.substring(0, 4) + '-' + code.substring(4, 8))
  }
  return codes
}

export async function POST(request) {
  try {
    const { supabase, user } = await getVercelAuth()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { token, secret } = body

    if (!token || !secret) {
      return NextResponse.json({ error: 'Token and secret are required' }, { status: 400 })
    }

    // Verify the TOTP token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow some time drift
    })

    if (!verified) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes()
    const hashedBackupCodes = backupCodes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    )

    // Enable 2FA for the user
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        two_factor_enabled: true,
        two_factor_secret: secret,
        two_factor_backup_codes: hashedBackupCodes,
        two_factor_secret_temp: null, // Clear temporary secret
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error enabling 2FA:', updateError)
      return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      backup_codes: backupCodes
    })

  } catch (error) {
    console.error('2FA verify API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}