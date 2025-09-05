import { AIFundingAgent } from './index.js'
import { supabase } from '../supabase.js'
import { MailgunEmailService } from '../email-service.js'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

class AgentManager {
  constructor() {
    this.activeAgents = new Map() // userId -> agent instance
    this.emailService = new MailgunEmailService()
    this.isRunning = false
    this.emailInterval = null
    this.healthCheckInterval = null
    this.performanceMetrics = {
      totalAgents: 0,
      activeAgents: 0,
      emailsSent: 0,
      errorsEncountered: 0,
      lastHealthCheck: null
    }
  }

  async startAgent(userId) {
    if (this.activeAgents.has(userId)) {
      return this.activeAgents.get(userId)
    }

    console.log(`🤖 Starting AI agent for user ${userId}`)
    
    try {
      const agent = new AIFundingAgent(userId, this.openai, supabase)
      this.activeAgents.set(userId, agent)
      
      // Update metrics
      this.performanceMetrics.activeAgents = this.activeAgents.size
      
      // Log agent start in database
      await this.logAgentActivity(userId, 'started')
      
      return agent
    } catch (error) {
      console.error(`Failed to start agent for user ${userId}:`, error)
      this.performanceMetrics.errorsEncountered++
      throw error
    }
  }

  async stopAgent(userId) {
    const agent = this.activeAgents.get(userId)
    if (agent) {
      try {
        agent.stop()
        this.activeAgents.delete(userId)
        
        // Update metrics
        this.performanceMetrics.activeAgents = this.activeAgents.size
        
        // Log agent stop in database
        await this.logAgentActivity(userId, 'stopped')
        
        console.log(`🛑 Stopped AI agent for user ${userId}`)
      } catch (error) {
        console.error(`Error stopping agent for user ${userId}:`, error)
        this.performanceMetrics.errorsEncountered++
      }
    }
  }

  async getAgent(userId) {
    if (!this.activeAgents.has(userId)) {
      return await this.startAgent(userId)
    }
    return this.activeAgents.get(userId)
  }

  async startAllAgents() {
    if (this.isRunning) return
    
    console.log('🚀 Starting AI Agent Manager with Mailgun Email Service')
    this.isRunning = true

    try {
      // Start email queue processing
      this.emailInterval = setInterval(() => {
        this.processEmailQueue()
      }, 60000) // Every minute
      
      // Start health monitoring
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck()
      }, 5 * 60000) // Every 5 minutes

      // Get all active users who have completed setup
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, email, organization_name')
        .eq('setup_completed', true)
        .eq('agent_enabled', true) // Only start agents for users who want them

      if (error) {
        console.error('Error fetching users for agent startup:', error)
        return
      }

      console.log(`Found ${users?.length || 0} users eligible for AI agents`)

      // Start agents for all eligible users
      const startupPromises = (users || []).map(async (user) => {
        try {
          await this.startAgent(user.id)
          
          // Send welcome email for new agent
          await this.sendAgentWelcomeEmail(user)
          
        } catch (error) {
          console.error(`Error starting agent for user ${user.id}:`, error)
          this.performanceMetrics.errorsEncountered++
        }
      })

      // Wait for all agents to start
      await Promise.allSettled(startupPromises)

      // Update metrics
      this.performanceMetrics.totalAgents = users?.length || 0
      this.performanceMetrics.activeAgents = this.activeAgents.size

      console.log(`✅ Started ${this.activeAgents.size} AI agents out of ${users?.length || 0} eligible users`)
      
      // Log manager startup
      await this.logManagerActivity('started', {
        totalUsers: users?.length || 0,
        activeAgents: this.activeAgents.size
      })

    } catch (error) {
      console.error('Error starting AI Agent Manager:', error)
      this.performanceMetrics.errorsEncountered++
      this.isRunning = false
    }
  }

  async processEmailQueue() {
    try {
      console.log('📧 Processing email queue...')
      
      // Process emails through Mailgun service
      const emailsProcessed = await this.emailService.processEmailQueue()
      
      // Update metrics
      this.performanceMetrics.emailsSent += emailsProcessed
      
      // Log email processing activity
      if (emailsProcessed > 0) {
        await this.logManagerActivity('emails_processed', {
          emailCount: emailsProcessed,
          timestamp: new Date().toISOString()
        })
      }
      
    } catch (error) {
      console.error('Error processing email queue:', error)
      this.performanceMetrics.errorsEncountered++
    }
  }

  async performHealthCheck() {
    try {
      console.log('🏥 Performing agent health check...')
      
      const healthStatus = {
        timestamp: new Date().toISOString(),
        totalAgents: this.activeAgents.size,
        unhealthyAgents: [],
        systemStatus: 'healthy'
      }

      // Check each agent's health
      for (const [userId, agent] of this.activeAgents) {
        try {
          // Basic health check - ensure agent is responsive
          if (!agent.isActive) {
            healthStatus.unhealthyAgents.push({
              userId,
              issue: 'Agent not active',
              action: 'restart_required'
            })
            
            // Attempt to restart unhealthy agent
            console.log(`🔄 Restarting unhealthy agent for user ${userId}`)
            await this.stopAgent(userId)
            await this.startAgent(userId)
          }
        } catch (error) {
          console.error(`Health check failed for agent ${userId}:`, error)
          healthStatus.unhealthyAgents.push({
            userId,
            issue: error.message,
            action: 'manual_intervention_required'
          })
        }
      }

      // Update system status
      if (healthStatus.unhealthyAgents.length > 0) {
        healthStatus.systemStatus = 'degraded'
      }

      // Update metrics
      this.performanceMetrics.lastHealthCheck = healthStatus.timestamp

      // Log health check results
      await this.logManagerActivity('health_check', healthStatus)

      // Send alert if too many unhealthy agents
      if (healthStatus.unhealthyAgents.length > this.activeAgents.size * 0.1) {
        await this.sendSystemAlert('High number of unhealthy agents detected', healthStatus)
      }

    } catch (error) {
      console.error('Error during health check:', error)
      this.performanceMetrics.errorsEncountered++
    }
  }

  async sendAgentWelcomeEmail(user) {
    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Your AI Funding Agent is Now Active',
        template: 'agent_welcome',
        data: {
          userName: user.organization_name || 'there',
          agentFeatures: [
            'Automatic opportunity discovery',
            'Deadline monitoring and alerts',
            'Strategic funding recommendations',
            'Application progress tracking'
          ],
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`
        }
      })
      
      console.log(`📧 Sent welcome email to ${user.email}`)
      
    } catch (error) {
      console.error(`Error sending welcome email to ${user.email}:`, error)
    }
  }

  async sendSystemAlert(subject, data) {
    try {
      // Send alert to system administrators
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
      
      for (const adminEmail of adminEmails) {
        await this.emailService.sendEmail({
          to: adminEmail.trim(),
          subject: `System Alert: ${subject}`,
          template: 'system_alert',
          data: {
            alertType: 'agent_manager',
            timestamp: new Date().toISOString(),
            details: data,
            metrics: this.performanceMetrics
          }
        })
      }
      
    } catch (error) {
      console.error('Error sending system alert:', error)
    }
  }

  async logAgentActivity(userId, activity, data = {}) {
    try {
      await supabase.from('agent_activity_log').insert([{
        user_id: userId,
        activity_type: activity,
        data: data,
        created_at: new Date().toISOString()
      }])
    } catch (error) {
      console.error('Error logging agent activity:', error)
    }
  }

  async logManagerActivity(activity, data = {}) {
    try {
      await supabase.from('agent_manager_log').insert([{
        activity_type: activity,
        data: data,
        metrics: this.performanceMetrics,
        created_at: new Date().toISOString()
      }])
    } catch (error) {
      console.error('Error logging manager activity:', error)
    }
  }

  async getManagerStatus() {
    return {
      isRunning: this.isRunning,
      activeAgents: this.activeAgents.size,
      agentsList: Array.from(this.activeAgents.keys()),
      metrics: this.performanceMetrics,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    }
  }

  async getAgentStatus(userId) {
    const agent = this.activeAgents.get(userId)
    if (!agent) {
      return {
        exists: false,
        status: 'not_running'
      }
    }

    try {
      // Get agent status from database
      const { data: agentData } = await supabase
        .from('ai_agents')
        .select(`
          *,
          agent_goals!inner(
            id,
            status,
            priority,
            description
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      return {
        exists: true,
        status: 'running',
        isActive: agent.isActive,
        goals: agentData?.agent_goals || [],
        activeGoals: agentData?.agent_goals?.filter(g => g.status === 'active')?.length || 0,
        lastActivity: agentData?.last_run_at,
        nextRun: agentData?.next_run_at
      }
    } catch (error) {
      console.error(`Error getting agent status for user ${userId}:`, error)
      return {
        exists: true,
        status: 'error',
        error: error.message
      }
    }
  }

  async restartAgent(userId) {
    console.log(`🔄 Restarting agent for user ${userId}`)
    
    try {
      await this.stopAgent(userId)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Brief pause
      const agent = await this.startAgent(userId)
      
      await this.logAgentActivity(userId, 'restarted')
      
      return {
        success: true,
        message: 'Agent restarted successfully'
      }
    } catch (error) {
      console.error(`Error restarting agent for user ${userId}:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async pauseAgent(userId) {
    const agent = this.activeAgents.get(userId)
    if (agent) {
      // Set agent to inactive without stopping completely
      agent.isActive = false
      
      await this.logAgentActivity(userId, 'paused')
      
      // Update database
      await supabase
        .from('ai_agents')
        .update({ is_active: false })
        .eq('user_id', userId)
      
      return { success: true, message: 'Agent paused' }
    }
    
    return { success: false, error: 'Agent not found' }
  }

  async resumeAgent(userId) {
    const agent = this.activeAgents.get(userId)
    if (agent) {
      // Reactivate agent
      agent.isActive = true
      
      await this.logAgentActivity(userId, 'resumed')
      
      // Update database
      await supabase
        .from('ai_agents')
        .update({ is_active: true })
        .eq('user_id', userId)
      
      return { success: true, message: 'Agent resumed' }
    }
    
    return { success: false, error: 'Agent not found' }
  }

  async broadcastToAllAgents(message, action = 'notification') {
    console.log(`📢 Broadcasting ${action} to all agents: ${message}`)
    
    const results = []
    
    for (const [userId, agent] of this.activeAgents) {
      try {
        switch (action) {
          case 'sync_opportunities':
            // Trigger opportunity sync for all agents
            await agent.scanAndEvaluateOpportunities()
            break
          case 'health_check':
            // Force health check for all agents
            await agent.performHealthCheck?.()
            break
          case 'notification':
          default:
            // Send notification to agent
            await agent.notifyUserOfAgentDecision?.('system_broadcast', {
              message,
              timestamp: new Date().toISOString()
            })
            break
        }
        
        results.push({ userId, status: 'success' })
        
      } catch (error) {
        console.error(`Error broadcasting to agent ${userId}:`, error)
        results.push({ userId, status: 'error', error: error.message })
      }
    }
    
    await this.logManagerActivity('broadcast', {
      message,
      action,
      results,
      totalAgents: this.activeAgents.size
    })
    
    return results
  }

  stop() {
    console.log('🛑 Stopping AI Agent Manager')
    
    try {
      // Clear intervals
      if (this.emailInterval) {
        clearInterval(this.emailInterval)
        this.emailInterval = null
      }
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }
      
      // Stop all agents
      for (const [userId, agent] of this.activeAgents) {
        try {
          agent.stop()
        } catch (error) {
          console.error(`Error stopping agent for user ${userId}:`, error)
        }
      }
      
      // Clear agents map
      this.activeAgents.clear()
      
      // Update state
      this.isRunning = false
      this.performanceMetrics.activeAgents = 0
      
      // Log shutdown
      this.logManagerActivity('stopped', {
        shutdownTime: new Date().toISOString(),
        finalMetrics: this.performanceMetrics
      })
      
      console.log('✅ AI Agent Manager stopped successfully')
      
    } catch (error) {
      console.error('Error during AI Agent Manager shutdown:', error)
    }
  }

  // Graceful shutdown handler
  async gracefulShutdown() {
    console.log('🔄 Initiating graceful shutdown of AI Agent Manager...')
    
    try {
      // Notify all agents of impending shutdown
      await this.broadcastToAllAgents('System maintenance - agents will restart shortly', 'notification')
      
      // Wait a moment for notifications to process
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Stop all agents
      this.stop()
      
      console.log('✅ Graceful shutdown completed')
      
    } catch (error) {
      console.error('Error during graceful shutdown:', error)
      // Force stop if graceful fails
      this.stop()
    }
  }
}

// Singleton instance
const agentManager = new AgentManager()

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  agentManager.gracefulShutdown()
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...')
  agentManager.gracefulShutdown()
})

export { agentManager, AgentManager }