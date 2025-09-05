// lib/ai-agent/email-service.js

import formData from 'form-data'
import Mailgun from 'mailgun.js'

export class MailgunEmailService {
  constructor() {
    this.mailgun = new Mailgun(formData)
    this.mg = this.mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_API_URL || 'https://api.mailgun.net' // Default to US
    })
    this.domain = process.env.MAILGUN_DOMAIN
    this.fromEmail = process.env.FROM_EMAIL
    
    this.templates = new EmailTemplateManager()
    this.isProcessing = false
  }

  // Main email processing queue
  async processEmailQueue() {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      // Get pending emails from database
      const { data: pendingEmails, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50) // Process in batches

      if (error) throw error

      for (const email of pendingEmails) {
        await this.sendEmail(email)
        await this.delay(200) // Rate limiting - Mailgun allows high throughput
      }
    } catch (error) {
      console.error('Email queue processing error:', error)
    } finally {
      this.isProcessing = false
    }
  }

  async sendEmail(emailCampaign) {
    try {
      // Check user preferences first
      const { data: preferences } = await supabase
        .from('user_ai_preferences')
        .select('*')
        .eq('user_id', emailCampaign.user_id)
        .single()

      if (!preferences?.email_notifications_enabled) {
        await this.updateEmailStatus(emailCampaign.id, 'skipped', {
          reason: 'User notifications disabled'
        })
        return
      }

      // Generate email content using templates
      const emailContent = await this.templates.generateEmail(
        emailCampaign.template_name,
        emailCampaign.data
      )

      // Prepare Mailgun message data
      const messageData = {
        from: `FundingOS AI Agent <${this.fromEmail}>`,
        to: emailCampaign.recipient_email,
        subject: emailCampaign.subject,
        html: emailContent.html,
        text: emailContent.text,
        // Mailgun tracking
        'o:tracking': 'yes',
        'o:tracking-clicks': 'yes',
        'o:tracking-opens': 'yes',
        // Custom variables for tracking
        'v:campaign_id': emailCampaign.id,
        'v:user_id': emailCampaign.user_id,
        'v:campaign_type': emailCampaign.campaign_type
      }

      // Add tags for better organization
      messageData['o:tag'] = [
        'ai-agent',
        emailCampaign.campaign_type,
        `user-${emailCampaign.user_id}`
      ]

      // Send email via Mailgun
      const response = await this.mg.messages.create(this.domain, messageData)

      // Update email status with Mailgun message ID
      await this.updateEmailStatus(emailCampaign.id, 'sent', {
        mailgun_id: response.id,
        mailgun_message: response.message,
        sent_at: new Date().toISOString()
      })

      console.log(`✅ Email sent successfully: ${emailCampaign.id} (Mailgun ID: ${response.id})`)

    } catch (error) {
      console.error(`❌ Email send failed: ${emailCampaign.id}`, error)
      
      await this.updateEmailStatus(emailCampaign.id, 'failed', {
        error: error.message,
        error_code: error.status || 'unknown'
      })
    }
  }

  async updateEmailStatus(emailId, status, metadata = {}) {
    await supabase
      .from('email_campaigns')
      .update({
        status,
        metadata: metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', emailId)
  }

  // Opportunity match email - called by AI agent
  async sendOpportunityMatchEmail(userId, opportunityMatch) {
    try {
      const { data: user } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      const { data: preferences } = await supabase
        .from('user_ai_preferences')
        .select('minimum_match_score_for_email')
        .eq('user_id', userId)
        .single()

      // Check if match score meets email threshold
      if (opportunityMatch.match_score < (preferences?.minimum_match_score_for_email || 70)) {
        console.log(`Match score ${opportunityMatch.match_score}% below threshold for user ${userId}`)
        return
      }

      // Create email campaign record
      const { data: campaign, error } = await supabase
        .from('email_campaigns')
        .insert([{
          user_id: userId,
          campaign_type: 'new_match',
          template_name: 'new_high_match',
          subject: `🎯 New ${opportunityMatch.match_score}% Match Found: ${opportunityMatch.opportunity.title}`,
          recipient_email: user.email,
          data: {
            user_name: user.full_name,
            match_score: opportunityMatch.match_score,
            opportunity: opportunityMatch.opportunity,
            project: opportunityMatch.project,
            reasons: opportunityMatch.reasons,
            recommended_actions: opportunityMatch.recommended_actions,
            app_url: process.env.NEXT_PUBLIC_APP_URL
          }
        }])
        .select()
        .single()

      if (error) throw error

      console.log(`📧 Queued opportunity match email for user ${userId}`)

      // Track the match in database
      await supabase.from('opportunity_matches').insert([{
        user_id: userId,
        project_id: opportunityMatch.project.id,
        opportunity_id: opportunityMatch.opportunity.id,
        match_score: opportunityMatch.match_score,
        match_reasons: opportunityMatch.reasons,
        email_sent: true,
        created_at: new Date().toISOString()
      }])

    } catch (error) {
      console.error('Error sending opportunity match email:', error)
    }
  }

  // Agent decision notification email
  async sendAgentDecisionEmail(userId, decision) {
    try {
      const { data: user } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      let templateName = 'agent_decision'
      let subject = 'Your AI Agent Made a Decision'

      // Customize based on decision type
      switch (decision.decision_type) {
        case 'emergency_action':
          templateName = 'urgent_deadline'
          subject = `🚨 URGENT: ${decision.decision_data?.title} - Action Required`
          break
        case 'opportunity_pursuit':
          templateName = 'agent_opportunity_pursuit'
          subject = `🎯 Your AI Agent is Pursuing: ${decision.decision_data?.opportunity?.title}`
          break
        case 'goal_update':
          templateName = 'agent_goal_update'
          subject = `📊 Your AI Agent Updated Your Funding Goals`
          break
      }

      // Create email campaign
      await supabase.from('email_campaigns').insert([{
        user_id: userId,
        campaign_type: 'agent_decision',
        template_name: templateName,
        subject: subject,
        recipient_email: user.email,
        data: {
          user_name: user.full_name,
          decision: decision,
          app_url: process.env.NEXT_PUBLIC_APP_URL
        }
      }])

      console.log(`📧 Queued agent decision email for user ${userId}`)

    } catch (error) {
      console.error('Error sending agent decision email:', error)
    }
  }

  // Weekly summary email
  async sendWeeklySummary(userId) {
    try {
      const context = await this.getUserWeeklyContext(userId)
      
      const { data: user } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      await supabase.from('email_campaigns').insert([{
        user_id: userId,
        campaign_type: 'weekly_summary',
        template_name: 'weekly_summary',
        subject: `📊 Your Weekly Funding Summary - Week of ${context.week_ending}`,
        recipient_email: user.email,
        data: {
          user_name: user.full_name,
          week_ending: context.week_ending,
          active_applications: context.active_applications,
          new_matches: context.new_matches,
          upcoming_deadlines: context.upcoming_deadlines,
          recommended_actions: context.recommended_actions,
          progress_highlights: context.progress_highlights,
          app_url: process.env.NEXT_PUBLIC_APP_URL
        }
      }])

      console.log(`📧 Queued weekly summary for user ${userId}`)

    } catch (error) {
      console.error('Error sending weekly summary:', error)
    }
  }

  async getUserWeeklyContext(userId) {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const [applications, matches, goals] = await Promise.all([
      supabase.from('application_submissions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['draft', 'in_progress', 'submitted', 'under_review']),
      
      supabase.from('opportunity_matches')
        .select('*, opportunities(*), projects(*)')
        .eq('user_id', userId)
        .gte('created_at', oneWeekAgo.toISOString()),
      
      supabase.from('agent_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
    ])

    return {
      week_ending: new Date().toLocaleDateString(),
      active_applications: applications.data?.length || 0,
      new_matches: matches.data?.length || 0,
      active_goals: goals.data?.length || 0,
      upcoming_deadlines: this.getUpcomingDeadlines(applications.data),
      recommended_actions: this.generateWeeklyActions(applications.data, matches.data),
      progress_highlights: await this.getProgressHighlights(userId, oneWeekAgo)
    }
  }

  getUpcomingDeadlines(applications) {
    const twoWeeksFromNow = new Date()
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14)

    return applications
      .filter(app => app.deadline_date && new Date(app.deadline_date) <= twoWeeksFromNow)
      .map(app => ({
        title: app.opportunity?.title || 'Application',
        date: new Date(app.deadline_date).toLocaleDateString()
      }))
      .slice(0, 5)
  }

  generateWeeklyActions(applications, matches) {
    const actions = []

    // High-match opportunities
    const highMatches = matches.filter(m => m.match_score >= 80)
    if (highMatches.length > 0) {
      actions.push(`Explore ${highMatches.length} high-match opportunities (80%+ fit)`)
    }

    // Incomplete applications
    const incompleteApps = applications.filter(a => ['draft', 'in_progress'].includes(a.status))
    if (incompleteApps.length > 0) {
      actions.push(`Complete ${incompleteApps.length} pending application(s)`)
    }

    // Upcoming deadlines
    const urgentApps = applications.filter(a => {
      if (!a.deadline_date) return false
      const daysUntil = Math.ceil((new Date(a.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      return daysUntil <= 7
    })
    if (urgentApps.length > 0) {
      actions.push(`Review ${urgentApps.length} application(s) with urgent deadlines`)
    }

    return actions
  }

  async getProgressHighlights(userId, since) {
    // Get recent progress updates
    const { data: recentGoals } = await supabase
      .from('agent_goals')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', since.toISOString())
      .order('updated_at', { ascending: false })

    const highlights = []

    // Goals completed
    const completedGoals = recentGoals?.filter(g => g.status === 'completed') || []
    if (completedGoals.length > 0) {
      highlights.push(`${completedGoals.length} goal(s) completed this week`)
    }

    // New goals set by agent
    const newGoals = recentGoals?.filter(g => g.created_by === 'agent' && g.status === 'active') || []
    if (newGoals.length > 0) {
      highlights.push(`AI agent set ${newGoals.length} new strategic goal(s)`)
    }

    return highlights
  }

  // Setup Mailgun webhooks for tracking
  async setupWebhooks() {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mailgun`
    
    try {
      // Create webhook for email events
      await this.mg.webhooks.create(this.domain, {
        id: 'email-tracking',
        url: webhookUrl,
        events: ['delivered', 'opened', 'clicked', 'unsubscribed', 'complained']
      })
      
      console.log('✅ Mailgun webhooks configured')
    } catch (error) {
      console.error('Error setting up Mailgun webhooks:', error)
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Enhanced Email Template Manager for Mailgun
class EmailTemplateManager {
  constructor() {
    this.baseTemplate = this.getBaseTemplate()
  }

  async generateEmail(templateName, data) {
    const template = this.getTemplate(templateName)
    if (!template) {
      throw new Error(`Template not found: ${templateName}`)
    }

    const html = this.renderTemplate(template.html, data)
    const text = this.renderTemplate(template.text, data)

    return {
      html: this.wrapInBaseTemplate(html, data),
      text: text
    }
  }

  renderTemplate(template, data) {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      return this.getNestedProperty(data, path) || match
    })
  }

  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  wrapInBaseTemplate(content, data) {
    return this.baseTemplate
      .replace('{{content}}', content)
      .replace('{{user_name}}', data.user_name || 'there')
      .replace('{{app_url}}', data.app_url || process.env.NEXT_PUBLIC_APP_URL)
  }

  getBaseTemplate() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>FundingOS AI Agent</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 10px 0; }
            .button:hover { background: #5a67d8; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .highlight { background: #f7fafc; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
            .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #667eea; }
            .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 FundingOS AI Agent</h1>
                <p>Your intelligent funding assistant</p>
            </div>
            <div class="content">
                {{content}}
            </div>
            <div class="footer">
                <p>© 2024 FundingOS. All rights reserved.</p>
                <p>
                    <a href="{{app_url}}/unsubscribe" style="color: #666;">Unsubscribe</a> | 
                    <a href="{{app_url}}/email-preferences" style="color: #666;">Email Preferences</a>
                </p>
                <p style="margin-top: 15px; font-size: 11px; color: #999;">
                    This email was sent by your AI agent based on your funding activities and preferences.
                </p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  getTemplate(name) {
    const templates = {
      new_high_match: {
        html: `
          <h2>🎯 New High-Match Opportunity Discovered!</h2>
          <p>Hi {{user_name}},</p>
          <p>Great news! Your AI agent found a <strong>{{match_score}}% match</strong> for your <strong>{{project.name}}</strong> project:</p>
          
          <div class="highlight">
              <h3 style="margin-top: 0; color: #667eea;">{{opportunity.title}}</h3>
              <p><strong>Sponsor:</strong> {{opportunity.sponsor}}</p>
              <p><strong>Amount:</strong> \${{opportunity.amount_min}} - \${{opportunity.amount_max}}</p>
              <p><strong>Deadline:</strong> {{opportunity.deadline_date}}</p>
          </div>
          
          <h4>🎯 Why your AI agent recommends this:</h4>
          <ul>
              {{#each reasons}}
              <li>{{this}}</li>
              {{/each}}
          </ul>
          
          <h4>⚡ Recommended next steps:</h4>
          <ul>
              {{#each recommended_actions}}
              <li>{{this}}</li>
              {{/each}}
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
              <a href="{{app_url}}/opportunities/{{opportunity.id}}" class="button">View Opportunity Details</a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
              <em>This opportunity was automatically discovered and analyzed by your AI agent. 
              The agent continues to work 24/7 to find the best funding matches for your projects.</em>
          </p>
        `,
        text: `
          🎯 New {{match_score}}% Match Found!
          
          Hi {{user_name}},
          
          Your AI agent discovered a high-match opportunity for your {{project.name}} project:
          
          {{opportunity.title}}
          Sponsor: {{opportunity.sponsor}}
          Amount: \${{opportunity.amount_min}} - \${{opportunity.amount_max}}
          Deadline: {{opportunity.deadline_date}}
          
          Why it's a great match:
          {{#each reasons}}
          - {{this}}
          {{/each}}
          
          View details: {{app_url}}/opportunities/{{opportunity.id}}
          
          Your AI agent is working 24/7 to find the best opportunities for you.
        `
      },

      urgent_deadline: {
        html: `
          <div style="background: #dc3545; color: white; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
              <h2 style="margin: 0;">⚠️ URGENT ACTION REQUIRED</h2>
          </div>
          
          <p>Hi {{user_name}},</p>
          <p><strong>Your AI agent has identified critical action needed:</strong></p>
          
          <div class="highlight" style="border-left-color: #dc3545; background: #fff5f5;">
              <h3 style="color: #dc3545; margin-top: 0;">{{decision.decision_data.title}}</h3>
              <p>{{decision.reasoning}}</p>
          </div>
          
          <h4>🚨 Immediate action required:</h4>
          <ul>
              {{#each decision.decision_data.actions}}
              <li><strong>{{this}}</strong></li>
              {{/each}}
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
              <a href="{{app_url}}/ai-agent" class="button" style="background: #dc3545;">VIEW IN AI AGENT DASHBOARD</a>
          </div>
          
          <p style="font-size: 14px; color: #666;">
              <em>Your AI agent is continuously monitoring your funding activities and will alert you to critical situations that require immediate attention.</em>
          </p>
        `,
        text: `
          ⚠️ URGENT ACTION REQUIRED
          
          {{decision.decision_data.title}}
          {{decision.reasoning}}
          
          Take action immediately: {{app_url}}/ai-agent
          
          Your AI agent is monitoring your funding activities 24/7.
        `
      },

      weekly_summary: {
        html: `
          <h2>📊 Your Weekly Funding Summary</h2>
          <p>Hi {{user_name}},</p>
          <p>Here's what your AI agent accomplished this week:</p>
          
          <div class="stats">
              <div class="stat-box">
                  <div class="stat-number">{{active_applications}}</div>
                  <div class="stat-label">Active Applications</div>
              </div>
              <div class="stat-box">
                  <div class="stat-number">{{new_matches}}</div>
                  <div class="stat-label">New Matches Found</div>
              </div>
              <div class="stat-box">
                  <div class="stat-number">{{active_goals}}</div>
                  <div class="stat-label">Active AI Goals</div>
              </div>
              <div class="stat-box">
                  <div class="stat-number">{{upcoming_deadlines.length}}</div>
                  <div class="stat-label">Upcoming Deadlines</div>
              </div>
          </div>
          
          {{#if upcoming_deadlines}}
          <h3>📅 Upcoming Deadlines</h3>
          <ul>
              {{#each upcoming_deadlines}}
              <li><strong>{{this.title}}</strong> - Due {{this.date}}</li>
              {{/each}}
          </ul>
          {{/if}}
          
          {{#if recommended_actions}}
          <h3>🎯 AI Agent Recommendations</h3>
          <ul>
              {{#each recommended_actions}}
              <li>{{this}}</li>
              {{/each}}
          </ul>
          {{/if}}
          
          {{#if progress_highlights}}
          <h3>✨ This Week's Highlights</h3>
          <ul>
              {{#each progress_highlights}}
              <li>{{this}}</li>
              {{/each}}
          </ul>
          {{/if}}
          
          <div style="text-align: center; margin: 30px 0;">
              <a href="{{app_url}}/ai-agent" class="button">Chat with Your AI Agent</a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
              <em>Your AI agent is working continuously to optimize your funding strategy. 
              These insights are generated from real-time analysis of your applications, opportunities, and goals.</em>
          </p>
        `,
        text: `
          📊 Weekly Funding Summary
          
          Hi {{user_name}},
          
          This week your AI agent managed:
          - {{active_applications}} active applications
          - {{new_matches}} new opportunity matches
          - {{active_goals}} strategic goals
          
          {{#if recommended_actions}}
          Recommendations:
          {{#each recommended_actions}}
          - {{this}}
          {{/each}}
          {{/if}}
          
          Chat with your AI agent: {{app_url}}/ai-agent
        `
      },

      agent_opportunity_pursuit: {
        html: `
          <h2>🎯 Your AI Agent is Taking Action</h2>
          <p>Hi {{user_name}},</p>
          <p>Your AI agent has decided to pursue a new funding opportunity:</p>
          
          <div class="highlight">
              <h3 style="margin-top: 0; color: #667eea;">{{decision.decision_data.opportunity.title}}</h3>
              <p><strong>For Project:</strong> {{decision.decision_data.project.name}}</p>
              <p><strong>Match Score:</strong> {{decision.decision_data.match_score}}%</p>
              <p><strong>Confidence:</strong> {{decision.confidence_score}}%</p>
          </div>
          
          <h4>🤖 Agent's Reasoning:</h4>
          <p>{{decision.reasoning}}</p>
          
          {{#if decision.requires_approval}}
          <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <h4 style="margin-top: 0;">👋 Your Input Needed</h4>
              <p>This decision requires your approval before the agent can proceed.</p>
              <div style="text-align: center;">
                  <a href="{{app_url}}/ai-agent" class="button">Review Decision</a>
              </div>
          </div>
          {{else}}
          <p><em>Your AI agent is proceeding autonomously with this opportunity based on your preferences and past feedback.</em></p>
          {{/if}}
          
          <div style="text-align: center; margin: 30px 0;">
              <a href="{{app_url}}/ai-agent" class="button">Chat with Your Agent</a>
          </div>
        `,
        text: `
          🎯 Your AI Agent is Taking Action
          
          Hi {{user_name}},
          
          Your AI agent decided to pursue: {{decision.decision_data.opportunity.title}}
          For project: {{decision.decision_data.project.name}}
          Match score: {{decision.decision_data.match_score}}%
          
          Reasoning: {{decision.reasoning}}
          
          {{#if decision.requires_approval}}
          Your approval needed: {{app_url}}/ai-agent
          {{/if}}
        `
      }
    }

    return templates[name]
  }
}
