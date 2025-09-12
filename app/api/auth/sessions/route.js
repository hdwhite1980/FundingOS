// app/api/auth/sessions/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import sessionManager from '../../../../lib/sessionManager'

// Get active sessions for current user
export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await sessionManager.getActiveSessions(user.id)

    return NextResponse.json({ 
      success: true, 
      sessions,
      currentSessionCount: sessions.length 
    })

  } catch (error) {
    console.error('Error getting user sessions:', error)
    return NextResponse.json({ error: 'Failed to get sessions' }, { status: 500 })
  }
}

// Force logout from all other sessions
export async function DELETE(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current session ID
    const { data: { session } } = await supabase.auth.getSession()
    const currentSessionId = session?.access_token ? 
      sessionManager.extractSessionId(session.access_token) : null

    // Deactivate all other sessions
    await sessionManager.deactivateOtherSessions(user.id, currentSessionId)

    return NextResponse.json({ 
      success: true, 
      message: 'All other sessions have been terminated' 
    })

  } catch (error) {
    console.error('Error terminating sessions:', error)
    return NextResponse.json({ error: 'Failed to terminate sessions' }, { status: 500 })
  }
}