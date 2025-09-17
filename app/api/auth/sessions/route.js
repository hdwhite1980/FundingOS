export const dynamic = 'force-dynamic'
// app/api/auth/sessions/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import sessionManager from '../../../../lib/sessionManager'

// Get active sessions for current user
export async function GET(request) {
  try {
    // VERCEL PRODUCTION FIX: Explicit cookie handling
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    // Try multiple auth methods
    let user = null
    let authMethod = 'none'
    
    // Method 1: getSession() first (better for Vercel)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (session?.user) {
      user = session.user
      authMethod = 'getSession'
    }
    
    // Method 2: getUser() fallback
    if (!user) {
      const { data: { user: user1 }, error: userError } = await supabase.auth.getUser()
      if (user1) {
        user = user1
        authMethod = 'getUser'
      }
    }
    
    console.log('🔐 Sessions API Debug (Vercel):', {
      hasSession: !!session,
      hasUser: !!user,
      authMethod,
      userId: user?.id
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: { 
          authMethod: 'none_worked',
          environment: 'vercel-production'
        }
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
    const { supabase, user, session } = await getVercelAuth()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current session ID
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