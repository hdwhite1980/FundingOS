// Assistant Notification Helper
// Use this in Assistant responses to send notifications to users

import { createClient } from '@supabase/supabase-js'

/**
 * Send a notification from the WALI-OS Assistant
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification details
 * @param {string} notification.type - Type: 'grant_match', 'deadline_reminder', 'status_update', 'funding_opportunity', 'system'
 * @param {string} notification.title - Notification title
 * @param {string} notification.message - Notification message
 * @param {Object} notification.metadata - Additional metadata (optional)
 * @returns {Promise<Object|null>} Created notification or null if failed
 */
export async function sendAssistantNotification(userId, notification) {
  try {
    // Use supabaseAdmin if available in the context, otherwise create service client
    let supabase
    
    // Try to get supabaseAdmin from the calling context
    try {
      const { supabaseAdmin: adminClient } = await import('./supabaseAdmin')
      supabase = adminClient
    } catch {
      // Fallback to creating service client
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
    }

    const { type, title, message, metadata = {} } = notification

    // Validate notification type
    const validTypes = ['grant_match', 'deadline_reminder', 'status_update', 'funding_opportunity', 'system']
    if (!validTypes.includes(type)) {
      console.error(`Invalid notification type: ${type}`)
      return null
    }

    // Add assistant context to metadata
    const enrichedMetadata = {
      ...metadata,
      source: 'wali_assistant',
      timestamp: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata: enrichedMetadata,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error sending assistant notification:', error)
      return null
    }

    console.log('✅ Assistant notification sent:', { title, type, userId })
    return data
  } catch (error) {
    console.error('sendAssistantNotification error:', error)
    return null
  }
}

/**
 * Common notification templates for the Assistant
 */
export const AssistantNotificationTemplates = {
  // When Assistant finds grant opportunities
  grantMatch: (count, totalFunding, grantIds) => ({
    type: 'grant_match',
    title: 'WALI Assistant found grant matches',
    message: `I found ${count} grant opportunities that match your profile`,
    metadata: {
      count,
      total_funding: totalFunding,
      grant_ids: grantIds,
      assistant_action: 'grant_search'
    }
  }),

  // When Assistant identifies an issue
  issueDetected: (issueName, severity) => ({
    type: 'system',
    title: 'WALI Assistant detected an issue',
    message: `I noticed: ${issueName}. Let me help you resolve this.`,
    metadata: {
      issue: issueName,
      severity,
      assistant_action: 'issue_detection'
    }
  }),

  // When Assistant provides recommendations
  recommendation: (title, message, actionItems) => ({
    type: 'system',
    title: `WALI Assistant: ${title}`,
    message,
    metadata: {
      action_items: actionItems,
      assistant_action: 'recommendation'
    }
  }),

  // When Assistant completes a complex task
  taskCompleted: (taskName, summary) => ({
    type: 'system',
    title: 'Task Completed',
    message: `I've finished: ${taskName}. ${summary}`,
    metadata: {
      task: taskName,
      summary,
      assistant_action: 'task_completion'
    }
  }),

  // When Assistant finds funding opportunities
  fundingOpportunity: (opportunityName, amount, source) => ({
    type: 'funding_opportunity',
    title: 'New Funding Opportunity Found',
    message: `${opportunityName} - Up to $${amount.toLocaleString()} available`,
    metadata: {
      opportunity_name: opportunityName,
      amount,
      source,
      assistant_action: 'opportunity_discovery'
    }
  }),

  // When Assistant provides compliance guidance
  complianceAlert: (requirement, deadline) => ({
    type: 'deadline_reminder',
    title: 'Compliance Requirement',
    message: `Action needed: ${requirement}`,
    metadata: {
      requirement,
      deadline,
      assistant_action: 'compliance_check'
    }
  }),

  // When Assistant analyzes documents
  documentAnalysis: (documentType, findings) => ({
    type: 'system',
    title: 'Document Analysis Complete',
    message: `I've analyzed your ${documentType}. ${findings}`,
    metadata: {
      document_type: documentType,
      findings,
      assistant_action: 'document_analysis'
    }
  })
}

/**
 * Example usage in Assistant code:
 * 
 * // When Assistant finds grants
 * await sendAssistantNotification(
 *   userId, 
 *   AssistantNotificationTemplates.grantMatch(3, 2500000, ['grant-1', 'grant-2', 'grant-3'])
 * )
 * 
 * // When Assistant detects an issue
 * await sendAssistantNotification(
 *   userId,
 *   AssistantNotificationTemplates.issueDetected('Profile incomplete - missing CAGE code', 'medium')
 * )
 * 
 * // Custom notification
 * await sendAssistantNotification(userId, {
 *   type: 'system',
 *   title: 'WALI Assistant Update',
 *   message: 'Your custom message here',
 *   metadata: { custom: 'data' }
 * })
 */
