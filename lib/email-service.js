// lib/email-service.js
class MailgunEmailService {
  constructor() {
    this.apiKey = process.env.MAILGUN_API_KEY
    this.domain = process.env.MAILGUN_DOMAIN
    this.emailQueue = []
    this.isProcessing = false
  }

  async sendEmail({ to, subject, template, data, html, text }) {
    try {
      if (!this.apiKey || !this.domain) {
        console.warn('Mailgun not configured, queuing email for later processing')
        return this.queueEmail({ to, subject, template, data, html, text })
      }

      const formData = new FormData()
      formData.append('from', `AI Funding Agent <noreply@${this.domain}>`)
      formData.append('to', to)
      formData.append('subject', subject)
      
      if (html) {
        formData.append('html', html)
      }
      
      if (text) {
        formData.append('text', text)
      } else {
        // Generate simple text version
        formData.append('text', this.generateTextFromTemplate(template, data))
      }

      const response = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Mailgun API error: ${response.status}`)
      }

      const result = await response.json()
      console.log(`Email sent successfully: ${subject} to ${to}`)
      return { success: true, messageId: result.id }
      
    } catch (error) {
      console.error('Error sending email:', error)
      // Fallback to queue if direct sending fails
      return this.queueEmail({ to, subject, template, data, html, text })
    }
  }

  queueEmail({ to, subject, template, data, html, text }) {
    this.emailQueue.push({
      to,
      subject,
      template,
      data,
      html,
      text,
      timestamp: new Date().toISOString(),
      attempts: 0
    })
    
    console.log(`Email queued: ${subject} to ${to}`)
    return { success: true, messageId: `queued_${Date.now()}` }
  }

  generateTextFromTemplate(template, data) {
    switch (template) {
      case 'opportunity_match':
        return `New Funding Opportunity Match\n\nA new funding opportunity has been found that matches your project criteria.\n\nOpportunity: ${data?.opportunity?.title || 'New Opportunity'}\nAmount: ${data?.opportunity?.amount || 'TBD'}\n\nLog in to your dashboard to learn more.`
      
      case 'agent_decision':
        return `AI Agent Decision\n\nYour AI funding agent has made an important decision:\n\n${data?.message || 'Decision notification'}\n\nLog in to your dashboard for more details.`
      
      case 'agent_welcome':
        return `Welcome! Your AI Funding Agent is Now Active\n\nYour AI funding agent is now actively working to help you find funding opportunities.\n\nFeatures:\n• Automatic opportunity discovery\n• Deadline monitoring\n• Strategic recommendations\n\nAccess your dashboard: ${data?.dashboardUrl || ''}`
      
      case 'system_alert':
        return `System Alert: ${data?.alertType || 'Notification'}\n\nTimestamp: ${data?.timestamp}\n\nDetails: ${JSON.stringify(data?.details || {}, null, 2)}`
      
      default:
        return `Notification from your AI Funding Agent\n\n${JSON.stringify(data, null, 2)}`
    }
  }

  async sendOpportunityMatchEmail(userId, opportunityMatch) {
    return this.sendEmail({
      to: opportunityMatch.userEmail || 'user@example.com',
      subject: `🎯 New Funding Match: ${opportunityMatch.opportunity?.title || 'Opportunity'}`,
      template: 'opportunity_match',
      data: opportunityMatch
    })
  }

  async sendAgentDecisionEmail(userId, decision) {
    return this.sendEmail({
      to: decision.userEmail || 'user@example.com',
      subject: `🤖 AI Agent Update: ${decision.title || 'Important Decision'}`,
      template: 'agent_decision',
      data: decision
    })
  }

  async processEmailQueue() {
    if (this.isProcessing || this.emailQueue.length === 0) {
      return 0
    }

    this.isProcessing = true
    let processed = 0

    try {
      const maxProcessing = Math.min(10, this.emailQueue.length) // Process up to 10 at a time
      const emailsToProcess = this.emailQueue.splice(0, maxProcessing)

      for (const email of emailsToProcess) {
        try {
          email.attempts = (email.attempts || 0) + 1
          
          if (email.attempts <= 3) { // Max 3 retry attempts
            await this.sendEmail(email)
            processed++
          } else {
            console.error(`Failed to send email after 3 attempts: ${email.subject} to ${email.to}`)
          }
        } catch (error) {
          console.error(`Error processing queued email:`, error)
          
          // Re-queue if under retry limit
          if (email.attempts < 3) {
            this.emailQueue.push(email)
          }
        }
      }
    } finally {
      this.isProcessing = false
    }

    if (processed > 0) {
      console.log(`Processed ${processed} emails from queue`)
    }

    return processed
  }

  getQueueStats() {
    return {
      queueLength: this.emailQueue.length,
      isProcessing: this.isProcessing,
      oldestEmail: this.emailQueue.length > 0 ? this.emailQueue[0].timestamp : null
    }
  }

  // Send conversation summary email
  async sendConversationSummary(userEmail, userName, conversation) {
    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      console.log('No conversation to send for:', userEmail)
      return
    }

    const { session, messages } = conversation
    const sessionDuration = this.calculateSessionDuration(session.session_start, session.session_end)
    
    // Format messages for email
    const formattedMessages = messages.map(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString()
      const sender = msg.type === 'user' ? userName || 'You' : 'AI Agent'
      return `[${time}] ${sender}: ${msg.content}`
    }).join('\n\n')

    const subject = `Your AI Funding Agent Conversation Summary - ${new Date(session.session_start).toLocaleDateString()}`
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">AI Funding Agent - Conversation Summary</h2>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Session Details</h3>
          <p><strong>Date:</strong> ${new Date(session.session_start).toLocaleDateString()}</p>
          <p><strong>Duration:</strong> ${sessionDuration}</p>
          <p><strong>Messages:</strong> ${messages.length}</p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Conversation History</h3>
          <div style="white-space: pre-wrap; font-family: monospace; font-size: 14px; line-height: 1.5; background: #f9fafb; padding: 15px; border-radius: 4px;">
${formattedMessages}
          </div>
        </div>

        <div style="margin: 30px 0; padding: 15px; background: #eff6ff; border-radius: 8px;">
          <p style="margin: 0; color: #1e40af;"><strong>Need more help?</strong> Log back in to continue your funding journey with our AI agent.</p>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          This conversation summary was automatically generated when you logged out of FundingOS.
          <br>Questions? Contact our support team.
        </p>
      </div>
    `

    const text = `
AI Funding Agent - Conversation Summary

Session Details:
Date: ${new Date(session.session_start).toLocaleDateString()}
Duration: ${sessionDuration}
Messages: ${messages.length}

Conversation History:
${formattedMessages}

---
This conversation summary was automatically generated when you logged out of FundingOS.
Questions? Contact our support team.
    `

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
      text
    })
  }

  calculateSessionDuration(startTime, endTime) {
    if (!startTime || !endTime) return 'Unknown'
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end - start
    
    const minutes = Math.floor(diffMs / 60000)
    const seconds = Math.floor((diffMs % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
}

export { MailgunEmailService }