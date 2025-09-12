// app/api/chat/load-session/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import chatSessionService from '../../../../lib/chatSessionService'

export async function GET(request) {
  const requestId = Math.random().toString(36).substring(7)
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`[${requestId}] ${timestamp} - Chat load-session request received`)
    
    const supabase = createRouteHandlerClient({ cookies })
    
    console.log(`[${requestId}] Attempting to get user from Supabase`)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error(`[${requestId}] Supabase auth error:`, authError)
      // For AuthSessionMissingError, return a more user-friendly response
      if (authError.__isAuthError && authError.message?.includes('Auth session missing')) {
        return NextResponse.json({ 
          error: 'Please log in to load chat history', 
          code: 'UNAUTHENTICATED',
          message: 'Authentication required for chat functionality'
        }, { status: 401 })
      }
      return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 })
    }

    if (!user) {
      console.log(`[${requestId}] No user found - unauthorized`)
      return NextResponse.json({ 
        error: 'Please log in to load chat history', 
        code: 'UNAUTHENTICATED',
        message: 'User session not found - please log in'
      }, { status: 401 })
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`)

    console.log(`[${requestId}] Attempting to load session messages for user ${user.id}`)
    // Load messages from active session
    const messages = await chatSessionService.loadSessionMessages(user.id)

    console.log(`[${requestId}] Messages loaded successfully: ${messages.length} messages`)
    return NextResponse.json({ success: true, messages })

  } catch (error) {
    console.error(`[${requestId}] Error loading chat session:`, error)
    console.error(`[${requestId}] Error stack:`, error.stack)
    return NextResponse.json({ error: 'Failed to load session', details: error.message }, { status: 500 })
  }
}