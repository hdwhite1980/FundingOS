// app/api/chat/load-session/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import chatSessionService from '../../../../lib/chatSessionService'

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load messages from active session
    const messages = await chatSessionService.loadSessionMessages(user.id)

    return NextResponse.json({ success: true, messages })

  } catch (error) {
    console.error('Error loading chat session:', error)
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 })
  }
}