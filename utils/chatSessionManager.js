// Chat session management utilities
// Handles exporting and cleaning up agent conversations

import { supabaseAdmin } from '../lib/supabaseAdmin'

/**
 * Export a user's chat sessions as formatted HTML
 * @param {string} userId - User ID
 * @param {Date} cutoffDate - Only include sessions before this date
 * @returns {Object} Formatted chat sessions ready for email
 */
export async function exportUserChatSessions(userId, cutoffDate = null) {
  try {
    console.log(`📤 Exporting chat sessions for user: ${userId}`)
    
    // Get user profile for personalization
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email, organization_name')
      .eq('user_id', userId)
      .single()

    if (!userProfile) {
      throw new Error(`User profile not found for ID: ${userId}`)
    }

    // Build query for conversations
    let query = supabaseAdmin
      .from('agent_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    // Apply cutoff date if provided
    if (cutoffDate) {
      query = query.lt('created_at', cutoffDate.toISOString())
    }

    const { data: conversations, error } = await query

    if (error) {
      throw error
    }

    if (!conversations || conversations.length === 0) {
      console.log(`📭 No conversations found for user: ${userId}`)
      return { hasData: false, userProfile }
    }

    console.log(`💬 Found ${conversations.length} conversation entries`)

    // Group conversations by session/day
    const sessionGroups = groupConversationsBySession(conversations)
    
    // Generate HTML for each session
    const formattedSessions = sessionGroups.map(session => ({
      date: formatSessionDate(session.startDate),
      messageCount: session.messages.length,
      html: generateSessionHTML(session)
    }))

    const totalMessages = conversations.length
    const sessionCount = sessionGroups.length
    const dateRange = getDateRange(conversations)

    return {
      hasData: true,
      userProfile,
      sessions: formattedSessions,
      summary: {
        totalMessages,
        sessionCount,
        dateRange,
        exportedAt: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('❌ Failed to export chat sessions:', error)
    throw error
  }
}

/**
 * Group conversations into logical sessions (by day or conversation breaks)
 */
function groupConversationsBySession(conversations) {
  const sessions = []
  let currentSession = null
  
  conversations.forEach(conv => {
    const convDate = new Date(conv.created_at)
    const dayKey = convDate.toDateString()
    
    // Start new session if different day or long gap
    if (!currentSession || currentSession.dayKey !== dayKey || isNewSessionGap(currentSession.lastTime, convDate)) {
      if (currentSession) {
        sessions.push(currentSession)
      }
      
      currentSession = {
        dayKey,
        startDate: convDate,
        messages: [],
        lastTime: convDate
      }
    }
    
    currentSession.messages.push({
      role: conv.role,
      content: conv.content,
      timestamp: convDate,
      metadata: conv.metadata
    })
    
    currentSession.lastTime = convDate
  })
  
  if (currentSession) {
    sessions.push(currentSession)
  }
  
  return sessions
}

/**
 * Check if there's a significant gap between messages (new session)
 */
function isNewSessionGap(lastTime, currentTime) {
  const gapMinutes = (currentTime - lastTime) / (1000 * 60)
  return gapMinutes > 30 // 30+ minute gap = new session
}

/**
 * Generate HTML for a single chat session
 */
function generateSessionHTML(session) {
  const messagesHTML = session.messages.map(msg => {
    const isUser = msg.role === 'user'
    const time = msg.timestamp.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
    
    return `
      <div style="margin-bottom: 15px; display: flex; ${isUser ? 'justify-content: flex-end' : 'justify-content: flex-start'};">
        <div style="max-width: 80%; ${isUser ? 'background: #2563eb; color: white;' : 'background: #f3f4f6; color: #111827;'} padding: 12px 16px; border-radius: 16px; ${isUser ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'} box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size: 14px; line-height: 1.5; margin-bottom: 4px;">
            ${escapeHTML(msg.content)}
          </div>
          <div style="font-size: 11px; opacity: 0.7; text-align: right;">
            ${isUser ? 'You' : 'Wali-OS Assistant'} • ${time}
          </div>
        </div>
      </div>
    `
  }).join('')
  
  return `
    <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <h3 style="margin: 0 0 20px 0; color: #374151; font-size: 16px; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
        📅 ${formatSessionDate(session.startDate)} (${session.messages.length} messages)
      </h3>
      <div style="min-height: 50px;">
        ${messagesHTML}
      </div>
    </div>
  `
}

/**
 * Format session date for display
 */
function formatSessionDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Get date range from conversations
 */
function getDateRange(conversations) {
  if (!conversations.length) return null
  
  const dates = conversations.map(c => new Date(c.created_at))
  const earliest = new Date(Math.min(...dates))
  const latest = new Date(Math.max(...dates))
  
  return {
    from: earliest.toLocaleDateString(),
    to: latest.toLocaleDateString()
  }
}

/**
 * Escape HTML to prevent XSS in email content
 */
function escapeHTML(text) {
  const div = { innerHTML: '' }
  div.textContent = div.innerText = text
  return div.innerHTML || text.replace(/[&<>'"]/g, function(tag) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag
  })
}

/**
 * Generate complete email HTML with chat sessions
 */
export function generateChatHistoryEmail(exportData) {
  const { userProfile, sessions, summary } = exportData
  
  const userName = userProfile.first_name ? 
    `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() :
    'Valued User'
  
  const organizationName = userProfile.organization_name || 'your organization'
  
  const sessionsHTML = sessions.map(session => session.html).join('')
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Wali-OS Chat History</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background-color: #f8fafc; line-height: 1.6;">
      
      <!-- Header -->
      <div style="max-width: 700px; margin: 0 auto 30px auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 20px; border-radius: 16px;">
        <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: 700;">📚 Your Chat History</h1>
        <p style="margin: 0; font-size: 18px; opacity: 0.9;">Wali-OS Assistant Conversations</p>
        <div style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 14px;">
          <strong>Exported:</strong> ${new Date(summary.exportedAt).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </div>
      </div>

      <!-- Main Content -->
      <div style="max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        
        <div style="margin-bottom: 30px;">
          <h2 style="margin: 0 0 15px 0; color: #111827; font-size: 24px;">Hi ${userName}! 👋</h2>
          <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
            As part of our privacy commitment, we're sending you a complete history of your conversations with Wali-OS Assistant before we archive them. 
            Your data matters to us, and we want to ensure you always have access to your important discussions about ${organizationName}'s funding journey.
          </p>
          
          <!-- Summary Stats -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 25px 0;">
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 15px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #0369a1;">${summary.totalMessages}</div>
              <div style="font-size: 12px; color: #075985; text-transform: uppercase; letter-spacing: 0.5px;">Messages</div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #15803d;">${summary.sessionCount}</div>
              <div style="font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Sessions</div>
            </div>
            <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 15px; text-align: center;">
              <div style="font-size: 14px; font-weight: 600; color: #a16207;">${summary.dateRange?.from}</div>
              <div style="font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">First Chat</div>
            </div>
          </div>
        </div>

        <hr style="border: none; height: 1px; background: linear-gradient(90deg, transparent, #e5e7eb, transparent); margin: 30px 0;">

        <!-- Chat Sessions -->
        <div style="margin-top: 30px;">
          <h3 style="margin: 0 0 25px 0; color: #111827; font-size: 20px; font-weight: 600;">💬 Your Conversations</h3>
          ${sessionsHTML}
        </div>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0 0 10px 0;">
            <strong>Questions about your data?</strong> We're here to help ensure your privacy and data control.
          </p>
          <p style="margin: 0;">
            This export includes all conversations through ${summary.dateRange?.to}. 
            Future conversations will be included in subsequent exports.
          </p>
          <div style="margin: 20px 0 0 0; padding: 15px; background: #f8fafc; border-radius: 8px; font-size: 13px;">
            🔒 <strong>Privacy Note:</strong> This email contains your private conversations. Please store it securely.
          </div>
        </div>
      </div>

      <!-- Wali-OS Branding Footer -->
      <div style="max-width: 700px; margin: 30px auto 0 auto; text-align: center; color: #9ca3af; font-size: 12px;">
        <div style="font-weight: 600; color: #16a34a; font-size: 14px;">WALI-OS</div>
        <div style="margin: 5px 0;">powered by AHTS • AI-Enhanced Funding Platform</div>
      </div>

    </body>
    </html>
  `
}

/**
 * Delete conversations older than specified date
 * @param {Date} cutoffDate - Delete conversations before this date
 * @returns {Object} Deletion results
 */
export async function deleteOldConversations(cutoffDate) {
  try {
    console.log(`🗑️ Deleting conversations older than: ${cutoffDate.toISOString()}`)
    
    const { data, error } = await supabaseAdmin
      .from('agent_conversations')
      .delete()
      .lt('created_at', cutoffDate.toISOString())

    if (error) {
      throw error
    }

    console.log(`✅ Successfully deleted old conversations`)
    
    return {
      success: true,
      deletedAt: new Date().toISOString(),
      cutoffDate: cutoffDate.toISOString()
    }

  } catch (error) {
    console.error('❌ Failed to delete old conversations:', error)
    throw error
  }
}

/**
 * Get unique users who have conversations older than cutoff date
 * @param {Date} cutoffDate 
 * @returns {Array} Array of user IDs with old conversations
 */
export async function getUsersWithOldConversations(cutoffDate) {
  try {
    const { data, error } = await supabaseAdmin
      .from('agent_conversations')
      .select('user_id')
      .lt('created_at', cutoffDate.toISOString())
      
    if (error) {
      throw error
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(data.map(row => row.user_id))]
    
    console.log(`👥 Found ${uniqueUserIds.length} users with conversations older than ${cutoffDate.toISOString()}`)
    
    return uniqueUserIds

  } catch (error) {
    console.error('❌ Failed to get users with old conversations:', error)
    throw error
  }
}