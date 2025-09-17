// pages/api/auth/sessions.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
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

    const userId = user.id

    if (req.method === 'GET') {
      // Get all active sessions for the user
      const { data: sessions, error } = await supabase
        .from('user_sessions')
        .select('session_id, login_time, last_activity, ip_address, user_agent, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        return res.status(500).json({ error: 'Failed to fetch sessions' })
      }

      // Mark current session (we can identify by the token used)
      const currentSessionId = extractSessionId(token)
      const sessionsWithCurrent = sessions.map(session => ({
        ...session,
        is_current: session.session_id === currentSessionId
      }))

      return res.status(200).json({ sessions: sessionsWithCurrent })

    } else if (req.method === 'DELETE') {
      const { sessionId, terminateAll } = req.body

      if (terminateAll) {
        // Terminate all other sessions except current
        const currentSessionId = extractSessionId(token)
        
        const { error } = await supabase
          .from('user_sessions')
          .update({
            is_active: false,
            deactivated_at: new Date().toISOString(),
            deactivation_reason: 'user_terminated_all_others'
          })
          .eq('user_id', userId)
          .neq('session_id', currentSessionId)
          .eq('is_active', true)

        if (error) {
          console.error('Error terminating all sessions:', error)
          return res.status(500).json({ error: 'Failed to terminate sessions' })
        }

        return res.status(200).json({ success: true, message: 'All other sessions terminated' })

      } else if (sessionId) {
        // Terminate specific session
        const currentSessionId = extractSessionId(token)
        
        if (sessionId === currentSessionId) {
          return res.status(400).json({ error: 'Cannot terminate current session' })
        }

        const { error } = await supabase
          .from('user_sessions')
          .update({
            is_active: false,
            deactivated_at: new Date().toISOString(),
            deactivation_reason: 'user_terminated'
          })
          .eq('user_id', userId)
          .eq('session_id', sessionId)
          .eq('is_active', true)

        if (error) {
          console.error('Error terminating session:', error)
          return res.status(500).json({ error: 'Failed to terminate session' })
        }

        return res.status(200).json({ success: true, message: 'Session terminated' })

      } else {
        return res.status(400).json({ error: 'sessionId or terminateAll required' })
      }

    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Sessions API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

function extractSessionId(accessToken) {
  try {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(accessToken).digest('hex').substring(0, 16)
  } catch (error) {
    return Math.random().toString(36).substring(2, 18) // Fallback
  }
}