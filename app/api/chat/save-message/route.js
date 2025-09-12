// app/api/chat/save-message/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import chatSessionService from '../../../../lib/chatSessionService'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageType, content, metadata = {} } = await request.json()

    if (!messageType || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['user', 'agent'].includes(messageType)) {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 })
    }

    // Save the message
    const message = await chatSessionService.saveMessage(user.id, messageType, content, metadata)

    return NextResponse.json({ success: true, message })

  } catch (error) {
    console.error('Error saving chat message:', error)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }
}