// app/api/chat/save-message/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import chatSessionService from '../../../../lib/chatSessionService'

export async function POST(request) {
  const requestId = Math.random().toString(36).substring(7)
  const timestamp = new Date().toISOString()
  
  try {
    console.log(`[${requestId}] ${timestamp} - Chat save-message request received`)
    
    const { userId, messageType, content, metadata = {} } = await request.json()

    if (!userId) {
      console.log(`[${requestId}] No user ID provided`)
      return NextResponse.json({ 
        error: 'User ID required', 
        code: 'BAD_REQUEST',
        message: 'Please provide userId in request body'
      }, { status: 400 })
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
    // Save the message
    const message = await chatSessionService.saveMessage(userId, messageType, content, metadata)

    console.log(`[${requestId}] Message saved successfully:`, message.id)
    return NextResponse.json({ success: true, message })

  } catch (error) {
    console.error(`[${requestId}] Error saving chat message:`, error)
    console.error(`[${requestId}] Error stack:`, error.stack)
    return NextResponse.json({ error: 'Failed to save message', details: error.message }, { status: 500 })
  }
}