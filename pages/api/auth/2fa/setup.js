// pages/api/auth/2fa/setup.js
import { createClient } from '@supabase/supabase-js'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get user from the session
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
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
      return res.status(500).json({ error: 'Failed to setup 2FA' })
    }

    return res.status(200).json({
      secret: secret.base32,
      qr_code: qrCodeUrl
    })

  } catch (error) {
    console.error('2FA setup API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}