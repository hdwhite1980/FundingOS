// app/api/auth/sessions/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Get active sessions for the current user
export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      console.log('🔐 Sessions API - User not authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔐 Sessions API - Authenticated:', user.id)

    // Get active sessions for the user
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_activity', { ascending: false })

    if (error) {
      // Check if this is a schema error (sessions table doesn't exist yet)
      if (error.message?.includes('user_sessions') || 
          error.message?.includes('does not exist')) {
        console.log('Sessions table not ready yet - this is expected during database setup')
        return NextResponse.json({ 
          success: true,
          sessions: [],
          message: 'Session management not yet configured' 
        })
      }
      
      console.error('Error fetching sessions:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    // Mark current session based on auth token
    const currentSessionId = user.session_id || null
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      is_current: session.session_id === currentSessionId
    }))

    return NextResponse.json({ sessions: sessionsWithCurrent })

  } catch (error) {
    console.error('Error getting user sessions:', error)
    return NextResponse.json({ error: 'Failed to get sessions' }, { status: 500 })
  }
}

// Create a new session (usually handled by auth flow)
export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      console.log('🔐 Sessions POST API - User not authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔐 Sessions POST API - Authenticated:', user.id)

    const userAgent = request.headers.get('user-agent')
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    // Create new session record
    const { data: newSession, error: insertError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        session_id: user.session_id || crypto.randomUUID(),
        user_agent: userAgent,
        ip_address: ip,
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating session:', insertError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ session: newSession }, { status: 201 })

  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

// Revoke/terminate a session
export async function DELETE(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Mark session as inactive
    const { error } = await supabase
      .from('user_sessions')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('session_id', sessionId)

    if (error) {
      console.error('Error revoking session:', error)
      return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error revoking session:', error)
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 })
  }
}
