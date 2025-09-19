// Email notification utilities for angel investor platform
// Integrate with your existing email service (SendGrid, AWS SES, etc.)

/**
 * Sends investment confirmation email to investor
 * @param {string} investorEmail - Investor's email address
 * @param {string} companyName - Company name
 * @param {number} amount - Investment amount
 * @param {Object} investmentDetails - Additional investment details
 */
export async function sendInvestmentConfirmationEmail(investorEmail, companyName, amount, investmentDetails = {}) {
  const emailContent = {
    to: investorEmail,
    subject: `Investment Confirmation - ${companyName}`,
    template: 'investment-confirmation',
    data: {
      companyName,
      amount: amount.toLocaleString(),
      investmentDate: new Date().toLocaleDateString(),
      transactionId: investmentDetails.transactionId,
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/angel/dashboard`
    },
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #16a34a; margin: 0;">WALI-OS</h1>
          <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">powered by AHTS</p>
          <p style="color: #6b7280; margin: 5px 0;">Angel Investment Platform</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; font-size: 28px;">Investment Confirmed! 🎉</h2>
          <p style="margin: 0; font-size: 18px; opacity: 0.9;">Your investment has been successfully processed</p>
        </div>

        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
          <h3 style="margin: 0 0 20px 0; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Investment Details</h3>
          <div style="display: grid; gap: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #6b7280; font-weight: 500;">Company:</span>
              <span style="color: #111827; font-weight: 600;">${companyName}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #6b7280; font-weight: 500;">Investment Amount:</span>
              <span style="color: #059669; font-weight: 700; font-size: 18px;">$${amount.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #6b7280; font-weight: 500;">Date:</span>
              <span style="color: #111827; font-weight: 600;">${new Date().toLocaleDateString()}</span>
            </div>
            ${investmentDetails.transactionId ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #6b7280; font-weight: 500;">Transaction ID:</span>
              <span style="color: #111827; font-weight: 600; font-family: monospace;">${investmentDetails.transactionId}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <h4 style="margin: 0 0 15px 0; color: #92400e; display: flex; align-items: center;">
            <span style="margin-right: 8px;">📋</span> Next Steps
          </h4>
          <ul style="margin: 0; padding-left: 20px; color: #78350f;">
            <li style="margin-bottom: 8px;">Monitor your investment performance in your dashboard</li>
            <li style="margin-bottom: 8px;">Receive regular updates from ${companyName}</li>
            <li style="margin-bottom: 8px;">Access quarterly reports and company updates</li>
            <li>Review your portfolio allocation and diversification</li>
          </ul>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/angel/dashboard" 
             style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            View Your Dashboard
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0 0 10px 0;">Thank you for investing with WALI-OS!</p>
          <p style="margin: 0;">If you have any questions, contact our support team.</p>
        </div>
      </div>
    `
  }
  
  return await sendEmail(emailContent)
}

/**
 * Sends new opportunity alert to investors
 * @param {string} investorEmail - Investor's email
 * @param {Object} opportunity - Opportunity details
 */
export async function sendNewOpportunityAlert(investorEmail, opportunity) {
  const emailContent = {
    to: investorEmail,
    subject: `New Investment Opportunity - ${opportunity.name}`,
    template: 'new-opportunity',
    data: {
      companyName: opportunity.name,
      industry: opportunity.industry,
      fundingGoal: opportunity.funding_goal.toLocaleString(),
      minimumInvestment: opportunity.minimum_investment.toLocaleString(),
      opportunityUrl: `${process.env.NEXT_PUBLIC_APP_URL}/angel/dashboard?opportunity=${opportunity.id}`
    },
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #16a34a; margin: 0;">WALI-OS</h1>
          <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">powered by AHTS</p>
          <p style="color: #6b7280; margin: 5px 0;">New Investment Opportunity</p>
        </div>
        
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
          <h2 style="margin: 0 0 15px 0; color: #0c4a6e;">🚀 ${opportunity.name}</h2>
          <p style="margin: 0 0 15px 0; color: #0369a1; font-size: 16px;">${opportunity.industry} • ${opportunity.funding_stage}</p>
          <p style="margin: 0; color: #0c4a6e;">${opportunity.description}</p>
        </div>

        <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Opportunity Highlights</h3>
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Funding Goal:</span>
              <span style="font-weight: 600;">$${opportunity.funding_goal.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Minimum Investment:</span>
              <span style="font-weight: 600;">$${opportunity.minimum_investment.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Stage:</span>
              <span style="font-weight: 600;">${opportunity.funding_stage}</span>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/angel/dashboard?opportunity=${opportunity.id}" 
             style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            View Opportunity
          </a>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">You're receiving this because you're subscribed to investment alerts.</p>
          <p style="margin: 5px 0 0 0;">
            <a href="#" style="color: #6b7280;">Unsubscribe</a> | 
            <a href="#" style="color: #6b7280;">Manage Preferences</a>
          </p>
        </div>
      </div>
    `
  }
  
  return await sendEmail(emailContent)
}

/**
 * Send chat history export email to user using SendGrid dynamic template
 * @param {string} userEmail - User's email address
 * @param {Object} exportData - Exported chat data with userProfile, conversations, summary
 */
export async function sendChatHistoryEmail(userEmail, exportData) {
  console.log(`📧 Sending chat history email to: ${userEmail}`)
  
  const { userProfile, conversations, summary } = exportData
  
  // Calculate metrics for the template
  const metrics = calculateEmailMetrics(summary, conversations)
  
  // Format date range
  const dateRange = `${new Date(summary.dateRange.from).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })} - ${new Date(summary.dateRange.to).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}`
  
  // Prepare chat messages for template (SendGrid format)
  const chatMessages = formatChatMessagesForEmail(summary.sessionGroups)
  
  // Prepare template data for SendGrid dynamic template
  const templateData = {
    // User information
    first_name: userProfile.first_name || 'Valued User',
    date_range: dateRange,
    
    // Executive summary metrics
    total_messages: metrics.totalMessages,
    opportunities_discussed: metrics.opportunitiesDiscussed,
    recommendations_made: metrics.recommendationsMade,
    
    // Chat messages array for Handlebars iteration
    chat_messages: chatMessages,
    
    // Footer links (you can customize these URLs)
    unsubscribe_url: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${encodeURIComponent(userEmail)}`,
    support_url: `${process.env.NEXT_PUBLIC_APP_URL}/support`
  }
  
  const subject = `Wali-OS Daily Intelligence Brief - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  
  const emailContent = {
    to: userEmail,
    subject: subject,
    template: 'daily-intelligence-brief', // Your SendGrid dynamic template ID/name
    data: templateData
  }
  
  try {
    await sendEmail(emailContent)
    console.log(`✅ Professional chat history email sent successfully to: ${userEmail}`)
  } catch (error) {
    console.error(`❌ Failed to send chat history email to ${userEmail}:`, error)
    throw error
  }
}

/**
 * Sends portfolio performance update
 * @param {string} investorEmail - Investor's email
 * @param {Object} portfolioStats - Portfolio statistics
 */
export async function sendPortfolioUpdate(investorEmail, portfolioStats) {
  const emailContent = {
    to: investorEmail,
    subject: 'Your Portfolio Performance Update',
    template: 'portfolio-update',
    data: portfolioStats,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Portfolio Performance Update</h2>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">Portfolio Summary</h3>
          <div style="display: grid; gap: 10px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Total Invested:</span>
              <span style="font-weight: 600;">$${portfolioStats.totalInvested.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Current Value:</span>
              <span style="font-weight: 600;">$${portfolioStats.currentValue.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Total ROI:</span>
              <span style="font-weight: 600; color: ${portfolioStats.totalROI >= 0 ? '#059669' : '#dc2626'};">
                ${portfolioStats.totalROI >= 0 ? '+' : ''}${portfolioStats.totalROI.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/angel/dashboard" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
            View Full Dashboard
          </a>
        </div>
      </div>
    `
  }
  
  return await sendEmail(emailContent)
}

/**
 * Sends company update notification
 * @param {string} investorEmail - Investor's email
 * @param {string} companyName - Company name
 * @param {string} updateTitle - Update title
 * @param {string} updateContent - Update content
 */
export async function sendCompanyUpdate(investorEmail, companyName, updateTitle, updateContent) {
  const emailContent = {
    to: investorEmail,
    subject: `Update from ${companyName}: ${updateTitle}`,
    template: 'company-update',
    data: {
      companyName,
      updateTitle,
      updateContent
    },
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Update from ${companyName}</h2>
        <h3 style="color: #374151;">${updateTitle}</h3>
        <div style="color: #4b5563; line-height: 1.6;">
          ${updateContent}
        </div>
      </div>
    `
  }
  
  return await sendEmail(emailContent)
}

/**
 * Generic email sending function
 * @param {Object} emailData - Email data object
 * @returns {Promise} Email sending result
 */
async function sendEmail(emailData) {
  try {
    // Replace this with your actual email service implementation
    // Examples: SendGrid, AWS SES, Mailgun, etc.
    
    if (process.env.EMAIL_SERVICE === 'sendgrid') {
      return await sendWithSendGrid(emailData)
    } else if (process.env.EMAIL_SERVICE === 'ses') {
      return await sendWithSES(emailData)
    } else {
      // Log email for development
      console.log('📧 Email would be sent:', {
        to: emailData.to,
        subject: emailData.subject,
        // Don't log full HTML in production
        preview: emailData.html ? emailData.html.substring(0, 100) + '...' : 'No content'
      })
      return { success: true, messageId: 'dev-email-' + Date.now() }
    }
  } catch (error) {
    console.error('Email sending failed:', error)
    throw new Error('Failed to send email: ' + error.message)
  }
}

/**
 * SendGrid integration with dynamic template support
 */
async function sendWithSendGrid(emailData) {
  // Example implementation with SendGrid
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  // const msg = {
  //   to: emailData.to,
  //   from: process.env.FROM_EMAIL,
  //   subject: emailData.subject,
  // }
  
  // // Check if using dynamic template
  // if (emailData.template && emailData.data) {
  //   msg.templateId = process.env[`SENDGRID_TEMPLATE_${emailData.template.toUpperCase().replace('-', '_')}`] || emailData.template
  //   msg.dynamicTemplateData = emailData.data
  // } else if (emailData.html) {
  //   msg.html = emailData.html
  // }
  
  // return await sgMail.send(msg)
  
  console.log('📧 SendGrid email (template mode):', {
    to: emailData.to,
    subject: emailData.subject,
    template: emailData.template,
    dataKeys: emailData.data ? Object.keys(emailData.data) : [],
    preview: emailData.html ? 'HTML content provided' : 'Using dynamic template'
  })
  
  throw new Error('SendGrid not implemented - add your implementation here')
}

/**
 * AWS SES integration example
 */
async function sendWithSES(emailData) {
  // Example implementation with AWS SES
  // const AWS = require('aws-sdk')
  // const ses = new AWS.SES({ region: process.env.AWS_REGION })
  
  // const params = {
  //   Destination: {
  //     ToAddresses: [emailData.to]
  //   },
  //   Message: {
  //     Body: {
  //       Html: {
  //         Data: emailData.html
  //       }
  //     },
  //     Subject: {
  //       Data: emailData.subject
  //     }
  //   },
  //   Source: process.env.FROM_EMAIL
  // }
  
  // return await ses.sendEmail(params).promise()
  
  throw new Error('AWS SES not implemented - add your implementation here')
}

function escapeHTMLForEmail(text) {
  if (!text) return ''
  return text.replace(/[&<>'"]/g, function(tag) {
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
 * Calculate metrics for the executive summary
 */
function calculateEmailMetrics(summary, conversations) {
  const metrics = {
    totalMessages: summary.totalMessages || 0,
    opportunitiesDiscussed: 0,
    recommendationsMade: 0
  }
  
  // Count opportunities and recommendations by analyzing conversation content
  if (conversations && Array.isArray(conversations)) {
    conversations.forEach(conv => {
      const content = (conv.content || '').toLowerCase()
      
      // Count opportunity-related keywords
      const opportunityKeywords = ['opportunity', 'grant', 'funding', 'rfp', 'proposal', 'application']
      if (opportunityKeywords.some(keyword => content.includes(keyword))) {
        metrics.opportunitiesDiscussed++
      }
      
      // Count recommendation-related keywords (typically from AI responses)
      if (conv.role === 'assistant') {
        const recommendationKeywords = ['recommend', 'suggest', 'should', 'consider', 'advice', 'strategy']
        if (recommendationKeywords.some(keyword => content.includes(keyword))) {
          metrics.recommendationsMade++
        }
      }
    })
  }
  
  return metrics
}

/**
 * Format chat messages for SendGrid dynamic template
 */
function formatChatMessagesForEmail(sessionGroups) {
  const messages = []
  
  if (!sessionGroups || !Array.isArray(sessionGroups)) {
    return messages
  }
  
  sessionGroups.forEach(session => {
    if (session.messages && Array.isArray(session.messages)) {
      session.messages.forEach(msg => {
        messages.push({
          is_ai_response: msg.role === 'assistant',
          message_content: msg.content || 'Message content not available',
          timestamp: new Date(msg.created_at || msg.timestamp).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          })
        })
      })
    }
  })
  
  return messages
}