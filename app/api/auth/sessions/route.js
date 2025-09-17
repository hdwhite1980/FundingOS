export const dynamic = 'force-dynamic'
// app/api/auth/sessions/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import sessionManager from '../../../../lib/sessionManager'

// Get active sessions for current user
export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Debug: Check session and user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('Sessions API Debug:', {
      hasSession: !!session,
      hasUser: !!user,
      sessionError,
      userError,
      userId: user?.id
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: { hasSession: !!session, hasUser: !!user, sessionError, userError }
      }, { status: 401 })
    }

    const sessions = await sessionManager.getActiveSessions(user.id)

    return NextResponse.json({ 
      success: true, 
      sessions,
      currentSessionCount: sessions.length 
    })

  } catch (error) {
    console.error('Error getting user sessions:', error)
    
    // Check if this is a schema error (table doesn't exist yet)
    if (error.message?.includes('user_sessions') || 
        error.message?.includes('does not exist') ||
        error.message?.includes('device_fingerprint')) {
      return NextResponse.json({ 
        success: true, 
        sessions: [],
        currentSessionCount: 0,
        message: 'Sessions feature not yet configured' 
      })
    }
    
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