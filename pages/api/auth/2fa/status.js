// pages/api/auth/2fa/status.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    // Check if user has 2FA enabled in their profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error checking 2FA status:', error)
      return res.status(500).json({ error: 'Failed to check 2FA status' })
    }

    return res.status(200).json({ 
      enabled: profile?.two_factor_enabled || false 
    })

  } catch (error) {
    console.error('2FA status API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}