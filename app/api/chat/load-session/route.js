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
    
    // Get user ID from URL params or headers (passed from authenticated frontend)
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    if (!userId) {
      console.log(`[${requestId}] No user ID provided`)
      return NextResponse.json({ 
        error: 'User ID required', 
        code: 'BAD_REQUEST',
        message: 'Please provide userId parameter'
      }, { status: 400 })
    }

    console.log(`[${requestId}] Loading session for user: ${userId}`)

    console.log(`[${requestId}] Attempting to load session messages for user ${userId}`)
    // Load messages from active session
    const messages = await chatSessionService.loadSessionMessages(userId)

    console.log(`[${requestId}] Messages loaded successfully: ${messages.length} messages`)
    return NextResponse.json({ success: true, messages })

  } catch (error) {
    console.error(`[${requestId}] Error loading chat session:`, error)
    console.error(`[${requestId}] Error stack:`, error.stack)
    return NextResponse.json({ error: 'Failed to load session', details: error.message }, { status: 500 })
  }
}