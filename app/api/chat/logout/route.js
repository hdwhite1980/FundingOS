// app/api/chat/logout/route.js
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getVercelAuth } from '../../../../lib/vercelAuthHelper'
import chatSessionService from '../../../../lib/chatSessionService'
import { MailgunEmailService } from '../../../../lib/email-service'

const emailService = new MailgunEmailService()

export async function POST(request) {
  try {
    const { supabase, user, authMethod } = await getVercelAuth(request)

    if (!user) {
      console.log('[logout] No user found during logout, authMethod:', authMethod)
      // Even if no user, we should allow logout to proceed gracefully
      return NextResponse.json({ 
        success: true, 
        message: 'Logged out (no active session found)' 
      })
    }

    console.log('[logout] Processing logout for user:', user.id, 'authMethod:', authMethod)

    // Get user profile for email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()

    const userEmail = profile?.email || user.email
    const userName = profile?.full_name || 'User'

    try {
      // Get conversation for email before closing sessions
      const conversation = await chatSessionService.getConversationForEmail(user.id)

      // Close active sessions
      await chatSessionService.closeActiveSessions(user.id)

      // Send conversation summary email if there was a conversation
      if (conversation && conversation.messages.length > 0) {
        await emailService.sendConversationSummary(userEmail, userName, conversation)
        console.log(`Conversation summary sent to: ${userEmail}`)
      }

      // Perform Supabase logout
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Supabase logout error:', error)
        // Don't return error here as session cleanup was successful
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Logged out successfully. Conversation summary will be sent to your email.' 
      })

    } catch (emailError) {
      console.error('Error sending conversation email:', emailError)
      
      // Still close sessions even if email fails
      await chatSessionService.closeActiveSessions(user.id)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Logged out successfully, but failed to send conversation summary.' 
      })
    }

  } catch (error) {
    console.error('Error during logout:', error)
    return NextResponse.json({ error: 'Failed to process logout' }, { status: 500 })
  }
}