// pages/api/auth/reset-password.js
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
    const { email, code, newPassword, action } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    switch (action) {
      case 'request': {
        // Send password reset email with code
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
        })

        if (error) {
          console.error('Password reset request error:', error)
          return res.status(400).json({ error: error.message })
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Password reset email sent. Check your inbox for instructions.' 
        })
      }

      case 'verify': {
        // Verify reset code and update password
        if (!code || !newPassword) {
          return res.status(400).json({ error: 'Code and new password are required' })
        }

        if (newPassword.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long' })
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
          return res.status(400).json({ error: 'Invalid or expired reset code' })
        }

        // Update the password
        const { error: updateError } = await resetClient.auth.updateUser({
          password: newPassword
        })

        if (updateError) {
          console.error('Password update error:', updateError)
          return res.status(400).json({ error: updateError.message })
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Password updated successfully. You can now sign in with your new password.' 
        })
      }

      case 'exchange': {
        // Exchange URL hash for access token (for URL-based reset flow)
        if (!code) {
          return res.status(400).json({ error: 'Reset code is required' })
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
            return res.status(400).json({ error: 'Invalid reset link format' })
          }

          // Verify the tokens by setting the session
          const { data, error } = await resetClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })

          if (error) {
            console.error('Token validation error:', error)
            return res.status(400).json({ error: 'Invalid or expired reset link' })
          }

          return res.status(200).json({ 
            success: true, 
            access_token: accessToken,
            user: data.user,
            message: 'Reset link verified. You can now set a new password.' 
          })
        } catch (parseError) {
          console.error('Token parsing error:', parseError)
          return res.status(400).json({ error: 'Invalid reset link format' })
        }
      }

      default:
        return res.status(400).json({ error: 'Invalid action. Use: request, verify, or exchange' })
    }

  } catch (error) {
    console.error('Password reset API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}