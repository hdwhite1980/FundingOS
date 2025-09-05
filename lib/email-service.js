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
}

export { MailgunEmailService }