// app/api/chat/save-message/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import chatSessionService from '../../../../lib/chatSessionService'

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7)
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`[${requestId}] ${timestamp} - Chat save-message request received`)
    
    // Parse request body first
    const { userId: bodyUserId, messageType, content, metadata = {} } = await request.json()
    
    // Create Supabase client with auth context
    const supabase = createRouteHandlerClient({ cookies })
    
    // Try to get user from session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    let userId = null
    
    if (sessionError || !session?.user) {
      console.log(`[${requestId}] No session found, checking request body for userId`)
      
      if (!bodyUserId) {
        console.log(`[${requestId}] No authenticated user found in session or request body`)
        return NextResponse.json({ 
          error: 'Authentication required', 
          code: 'UNAUTHORIZED',
          message: 'Please log in to save chat messages'
        }, { status: 401 })
      }
      
      userId = bodyUserId
      console.log(`[${requestId}] Using userId from request body: ${userId} (no session)`)
    } else {
      userId = session.user.id
      console.log(`[${requestId}] Using userId from session: ${userId}`)
    }

    if (!messageType || !content) {
      console.log(`[${requestId}] Missing required fields:`, { messageType: !!messageType, content: !!content })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['user', 'agent'].includes(messageType)) {
      console.log(`[${requestId}] Invalid message type:`, messageType)
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 })
    }

    console.log(`[${requestId}] Attempting to save message for user ${userId}`)
    
    // Use the authenticated Supabase client to save the message
    const message = await chatSessionService.saveMessageWithAuth(supabase, userId, messageType, content, metadata)

    console.log(`[${requestId}] Message saved successfully:`, message.id)
    return NextResponse.json({ success: true, message })

  } catch (error) {
    console.error(`[${requestId}] Error saving chat message:`, error)
    console.error(`[${requestId}] Error stack:`, error.stack)
    return NextResponse.json({ error: 'Failed to save message', details: error.message }, { status: 500 })
  }
}