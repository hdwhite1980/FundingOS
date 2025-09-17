// pages/api/auth/forgot-password.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Check if user exists first (optional - you might want to always return success for security)
    const { data: userCheck, error: checkError } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email)
      .single()

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
    })

    if (error) {
      console.error('Forgot password error:', error)
      // Don't reveal if user exists or not for security
      return res.status(200).json({ 
        success: true, 
        message: 'If an account with that email exists, we have sent password reset instructions.' 
      })
    }

    return res.status(200).json({ 
      success: true, 
      message: 'If an account with that email exists, we have sent password reset instructions.' 
    })

  } catch (error) {
    console.error('Forgot password API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}