// pages/api/auth/2fa/verify.js
import { createClient } from '@supabase/supabase-js'
import speakeasy from 'speakeasy'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateBackupCodes() {
  const codes = []
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code.substring(0, 4) + '-' + code.substring(4, 8))
  }
  return codes
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { token, secret } = req.body

    if (!token || !secret) {
      return res.status(400).json({ error: 'Token and secret are required' })
    }

    // Get user from the session
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const authToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Verify the TOTP token
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow some time drift
    })

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' })
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
      return res.status(500).json({ error: 'Failed to enable 2FA' })
    }

    return res.status(200).json({
      success: true,
      backup_codes: backupCodes
    })

  } catch (error) {
    console.error('2FA verify API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}