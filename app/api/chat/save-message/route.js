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
    
    const supabase = createRouteHandlerClient({ cookies })
    
    console.log(`[${requestId}] Attempting to get user from Supabase`)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error(`[${requestId}] Supabase auth error:`, authError)
      return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 })
    }

    if (!user) {
      console.log(`[${requestId}] No user found - unauthorized`)
      const cookieStore = cookies()
      const authCookies = []
      cookieStore.forEach((value, key) => {
        if (key.includes('auth') || key.includes('supabase')) {
          authCookies.push(`${key}: ${value ? 'present' : 'missing'}`)
        }
      })
      console.log(`[${requestId}] Auth cookies:`, authCookies)
      return NextResponse.json({ error: 'Unauthorized - no user found' }, { status: 401 })
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`)

    const { messageType, content, metadata = {} } = await request.json()

    if (!messageType || !content) {
      console.log(`[${requestId}] Missing required fields:`, { messageType: !!messageType, content: !!content })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['user', 'agent'].includes(messageType)) {
      console.log(`[${requestId}] Invalid message type:`, messageType)
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 })
    }

    console.log(`[${requestId}] Attempting to save message for user ${user.id}`)
    // Save the message
    const message = await chatSessionService.saveMessage(user.id, messageType, content, metadata)

    console.log(`[${requestId}] Message saved successfully:`, message.id)
    return NextResponse.json({ success: true, message })

  } catch (error) {
    console.error(`[${requestId}] Error saving chat message:`, error)
    console.error(`[${requestId}] Error stack:`, error.stack)
    return NextResponse.json({ error: 'Failed to save message', details: error.message }, { status: 500 })
  }
}