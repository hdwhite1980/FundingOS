// API endpoint for chat conversation cleanup
// This handles the 24-hour cleanup process: export → email → delete

import { NextResponse } from 'next/server'
import { exportUserChatSessions, deleteOldConversations, getUsersWithOldConversations } from '../../../utils/chatSessionManager'
import { sendChatHistoryEmail } from '../../../utils/emailNotifications'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

// This can be called by a cron job or scheduled task
export async function POST(request) {
  try {
    const body = await request.json()
    const { action = 'cleanup', dryRun = false, hoursOld = 24 } = body

    console.log(`🧹 Starting chat cleanup process - Action: ${action}, DryRun: ${dryRun}, Hours: ${hoursOld}`)

    // Calculate cutoff date (default 24 hours ago)
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - hoursOld)

    if (action === 'cleanup') {
      return await performCleanup(cutoffDate, dryRun)
    } else if (action === 'preview') {
      return await previewCleanup(cutoffDate)
    } else if (action === 'export-user') {
      const { userId } = body
      if (!userId) {
        return NextResponse.json({ error: 'userId required for export-user action' }, { status: 400 })
      }
      return await exportSingleUser(userId, cutoffDate)
    }

    return NextResponse.json({ error: 'Invalid action. Use: cleanup, preview, or export-user' }, { status: 400 })

  } catch (error) {
    console.error('❌ Chat cleanup failed:', error)
    return NextResponse.json({ 
      error: 'Cleanup failed', 
      details: error.message 
    }, { status: 500 })
  }
}

/**
 * Perform the full cleanup process: export → email → delete
 */
async function performCleanup(cutoffDate, dryRun = false) {
  const results = {
    cutoffDate: cutoffDate.toISOString(),
    dryRun,
    usersProcessed: 0,
    emailsSent: 0,
    emailsFailed: 0,
    conversationsDeleted: 0,
    errors: [],
    startTime: new Date().toISOString()
  }

  try {
    // Step 1: Find users with old conversations
    const userIds = await getUsersWithOldConversations(cutoffDate)
    console.log(`👥 Found ${userIds.length} users with conversations to cleanup`)

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No conversations found for cleanup',
        results
      })
    }

    // Step 2: Process each user
    for (const userId of userIds) {
      try {
        console.log(`🔄 Processing user: ${userId}`)
        
        // Export chat sessions
        const exportData = await exportUserChatSessions(userId, cutoffDate)
        
        if (!exportData.hasData) {
          console.log(`📭 No data to export for user: ${userId}`)
          continue
        }

        results.usersProcessed++

        // Send email (if not dry run)
        if (!dryRun) {
          try {
            const userEmail = exportData.userProfile.email
            if (userEmail) {
              await sendChatHistoryEmail(userEmail, exportData)
              results.emailsSent++
              console.log(`📧 Email sent to: ${userEmail}`)
            } else {
              console.warn(`⚠️ No email address for user: ${userId}`)
              results.errors.push(`No email address for user: ${userId}`)
            }
          } catch (emailError) {
            console.error(`❌ Email failed for user ${userId}:`, emailError)
            results.emailsFailed++
            results.errors.push(`Email failed for ${userId}: ${emailError.message}`)
          }
        } else {
          console.log(`🧪 DRY RUN: Would send email to ${exportData.userProfile.email}`)
        }

      } catch (userError) {
        console.error(`❌ Failed to process user ${userId}:`, userError)
        results.errors.push(`Failed to process ${userId}: ${userError.message}`)
      }
    }

    // Step 3: Delete old conversations (if not dry run)
    if (!dryRun) {
      console.log(`🗑️ Deleting conversations older than ${cutoffDate.toISOString()}`)
      
      // Get count before deletion for reporting
      const { count } = await supabaseAdmin
        .from('agent_conversations')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString())

      results.conversationsDeleted = count || 0

      if (count > 0) {
        await deleteOldConversations(cutoffDate)
        console.log(`✅ Deleted ${count} old conversations`)
      }
    } else {
      // Count what would be deleted
      const { count } = await supabaseAdmin
        .from('agent_conversations')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString())
      
      results.conversationsDeleted = count || 0
      console.log(`🧪 DRY RUN: Would delete ${count} conversations`)
    }

    results.endTime = new Date().toISOString()
    results.success = true

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry run completed successfully' : 'Cleanup completed successfully',
      results
    })

  } catch (error) {
    console.error('❌ Cleanup process failed:', error)
    results.endTime = new Date().toISOString()
    results.success = false
    
    return NextResponse.json({
      success: false,
      error: 'Cleanup process failed',
      details: error.message,
      results
    }, { status: 500 })
  }
}

/**
 * Preview what would be cleaned up without actually doing it
 */
async function previewCleanup(cutoffDate) {
  try {
    const userIds = await getUsersWithOldConversations(cutoffDate)
    
    // Get conversation count
    const { count } = await supabaseAdmin
      .from('agent_conversations')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString())

    // Get user details
    const userProfiles = await Promise.all(
      userIds.slice(0, 10).map(async (userId) => { // Limit to first 10 for preview
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name, email, organization_name')
          .eq('user_id', userId)
          .single()
        
        return { userId, ...data }
      })
    )

    return NextResponse.json({
      success: true,
      preview: {
        cutoffDate: cutoffDate.toISOString(),
        totalUsers: userIds.length,
        totalConversations: count,
        sampleUsers: userProfiles,
        message: `Would process ${userIds.length} users and delete ${count} conversations`
      }
    })

  } catch (error) {
    console.error('❌ Preview failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Preview failed',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Export and email chat history for a single user
 */
async function exportSingleUser(userId, cutoffDate) {
  try {
    console.log(`📤 Exporting chat history for user: ${userId}`)
    
    const exportData = await exportUserChatSessions(userId, cutoffDate)
    
    if (!exportData.hasData) {
      return NextResponse.json({
        success: true,
        message: 'No chat history found for this user',
        userId
      })
    }

    // Send email
    const userEmail = exportData.userProfile.email
    if (userEmail) {
      await sendChatHistoryEmail(userEmail, exportData)
      
      return NextResponse.json({
        success: true,
        message: `Chat history sent to ${userEmail}`,
        userId,
        summary: exportData.summary
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'No email address found for user',
        userId
      }, { status: 400 })
    }

  } catch (error) {
    console.error(`❌ Single user export failed for ${userId}:`, error)
    return NextResponse.json({
      success: false,
      error: 'Export failed',
      details: error.message,
      userId
    }, { status: 500 })
  }
}

// GET endpoint for health check
export async function GET(request) {
  return NextResponse.json({
    service: 'Chat Cleanup API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /api/chat-cleanup': 'Main cleanup endpoint',
      'GET /api/chat-cleanup': 'Health check'
    },
    actions: {
      'cleanup': 'Full cleanup process (export → email → delete)',
      'preview': 'Preview what would be cleaned up',
      'export-user': 'Export and email single user history'
    },
    parameters: {
      'action': 'cleanup | preview | export-user',
      'dryRun': 'boolean - if true, no emails sent or data deleted',
      'hoursOld': 'number - cleanup conversations older than this many hours (default: 24)',
      'userId': 'string - required for export-user action'
    }
  })
}