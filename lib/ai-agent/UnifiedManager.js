// lib/ai-agent/UnifiedManager.js
// Production-optimized manager for the unified AI agent system

import { UnifiedFundingAgent } from './UnifiedAgent.js'
import { supabase } from '../supabase.js'

class UnifiedAgentManager {
  constructor() {
    this.activeAgents = new Map() // userId -> UnifiedFundingAgent
    this.isRunning = false
    this.healthCheckInterval = null
    this.performanceMetrics = {
      totalUsers: 0,
      activeAgents: 0,
      totalDecisions: 0,
      avgSuccessRate: 0,
      systemHealth: 'healthy'
    }
  }

  // === LIFECYCLE MANAGEMENT ===

  async startAllAgents() {
    if (this.isRunning) {
      console.log('⚠️ Agent manager already running')
      return
    }

    console.log('🚀 Starting Unified AI Agent Manager')
    this.isRunning = true

    try {
      // Get all users who should have agents - try profiles first, then user_profiles
      let users = null
      let error = null

      try {
        const result = await supabase
          .from('profiles')
          .select('id, organization_name, setup_completed')
          .eq('setup_completed', true)
        
        users = result.data
        error = result.error
      } catch (profilesError) {
        // profiles table doesn't exist, try user_profiles
        console.log('⚠️ profiles table not found, trying user_profiles table')
        
        const result = await supabase
          .from('user_profiles')
          .select('user_id as id, organization_name, setup_completed')
          .eq('setup_completed', true)
        
        users = result.data
        error = result.error
      }

      if (error) throw error

      console.log(`Found ${users?.length || 0} users for agent initialization`)

      // Start agents for all eligible users
      const startPromises = (users || []).map(user => this.startAgentForUser(user.id))
      const results = await Promise.allSettled(startPromises)

      // Count successful starts
      const successful = results.filter(r => r.status === 'fulfilled').length
      console.log(`✅ Successfully started ${successful}/${users?.length || 0} agents`)

      // Update metrics
      this.performanceMetrics.totalUsers = users?.length || 0
      this.performanceMetrics.activeAgents = successful

      // Start health monitoring
      this.startHealthMonitoring()

      // Log manager startup
      await this.logManagerActivity('started', {
        totalUsers: users?.length || 0,
        successfulStarts: successful,
        startTime: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error starting unified agent manager:', error)
      this.isRunning = false
      throw error
    }
  }

  async startAgentForUser(userId) {
    try {
      if (this.activeAgents.has(userId)) {
        console.log(`Agent for user ${userId} already running`)
        return this.activeAgents.get(userId)
      }

      console.log(`🤖 Starting unified agent for user ${userId}`)
      
      const agent = new UnifiedFundingAgent(userId)
      await agent.initialize()
      
      this.activeAgents.set(userId, agent)
      
      // Update database
      await supabase.from('agent_status').upsert({
        user_id: userId,
        status: 'active',
        agent_type: 'unified',
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })

      console.log(`✅ Agent started for user ${userId}`)
      return agent

    } catch (error) {
      console.error(`Failed to start agent for user ${userId}:`, error)
      
      // Log failure
      await supabase.from('agent_errors').insert({
        user_id: userId,
        error_type: 'startup_failure',
        error_message: error.message,
        created_at: new Date().toISOString()
      })
      
      throw error
    }
  }

  async stopAgentForUser(userId) {
    const agent = this.activeAgents.get(userId)
    if (agent) {
      try {
        await agent.stop()
        this.activeAgents.delete(userId)
        
        // Update database
        await supabase.from('agent_status').upsert({
          user_id: userId,
          status: 'stopped',
          stopped_at: new Date().toISOString()
        })
        
        console.log(`🛑 Stopped agent for user ${userId}`)
        
      } catch (error) {
        console.error(`Error stopping agent for user ${userId}:`, error)
      }
    }
  }

  async pauseAgentForUser(userId) {
    const agent = this.activeAgents.get(userId)
    if (agent) {
      try {
        await agent.pause()
        
        await supabase.from('agent_status').update({
          status: 'paused',
          paused_at: new Date().toISOString()
        }).eq('user_id', userId)
        
        return { success: true, message: 'Agent paused' }
        
      } catch (error) {
        console.error(`Error pausing agent for user ${userId}:`, error)
        return { success: false, error: error.message }
      }
    }
    return { success: false, error: 'Agent not found' }
  }

  async resumeAgentForUser(userId) {
    const agent = this.activeAgents.get(userId)
    if (agent) {
      try {
        await agent.resume()
        
        await supabase.from('agent_status').update({
          status: 'active',
          resumed_at: new Date().toISOString()
        }).eq('user_id', userId)
        
        return { success: true, message: 'Agent resumed' }
        
      } catch (error) {
        console.error(`Error resuming agent for user ${userId}:`, error)
        return { success: false, error: error.message }
      }
    }
    return { success: false, error: 'Agent not found' }
  }

  // === HEALTH MONITORING ===

  startHealthMonitoring() {
    console.log('🏥 Starting health monitoring...')
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('Health check error:', error)
      }
    }, 10 * 60 * 1000) // Every 10 minutes
  }

  async performHealthCheck() {
    console.log('🔍 Performing system health check...')
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      totalAgents: this.activeAgents.size,
      healthyAgents: 0,
      unhealthyAgents: [],
      systemIssues: [],
      performanceMetrics: { ...this.performanceMetrics }
    }

    // Check each agent's health
    for (const [userId, agent] of this.activeAgents) {
      try {
        if (agent.isActive) {
          healthReport.healthyAgents++
        } else {
          healthReport.unhealthyAgents.push({
            userId,
            issue: 'Agent not active',
            action: 'restart_required'
          })
          
          // Attempt automatic restart
          console.log(`🔄 Attempting to restart agent for user ${userId}`)
          await this.restartAgentForUser(userId)
        }
      } catch (error) {
        healthReport.unhealthyAgents.push({
          userId,
          issue: error.message,
          action: 'manual_intervention'
        })
      }
    }

    // Update system health status
    const healthPercentage = this.activeAgents.size > 0 ? 
      (healthReport.healthyAgents / this.activeAgents.size) : 1
    
    if (healthPercentage < 0.8) {
      healthReport.systemHealth = 'degraded'
      this.performanceMetrics.systemHealth = 'degraded'
    } else if (healthPercentage < 0.5) {
      healthReport.systemHealth = 'critical'
      this.performanceMetrics.systemHealth = 'critical'
    } else {
      healthReport.systemHealth = 'healthy'
      this.performanceMetrics.systemHealth = 'healthy'
    }

    // Log health report
    await this.logHealthReport(healthReport)

    // Send alerts if needed
    if (healthReport.systemHealth !== 'healthy') {
      await this.sendHealthAlert(healthReport)
    }

    console.log(`🏥 Health check complete: ${healthReport.healthyAgents}/${this.activeAgents.size} agents healthy`)
  }

  async restartAgentForUser(userId) {
    try {
      await this.stopAgentForUser(userId)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Brief pause
      await this.startAgentForUser(userId)
      
      return { success: true, message: 'Agent restarted successfully' }
    } catch (error) {
      console.error(`Failed to restart agent for user ${userId}:`, error)
      return { success: false, error: error.message }
    }
  }

  // === USER INTERACTION MANAGEMENT ===

  async handleUserMessage(userId, message, context = {}) {
    try {
      const agent = this.activeAgents.get(userId)
      
      if (!agent) {
        // Try to start agent if it doesn't exist
        console.log(`Starting agent for user ${userId} to handle message`)
        const newAgent = await this.startAgentForUser(userId)
        return await newAgent.handleUserMessage(message, context)
      }

      if (!agent.isActive) {
        await agent.resume()
      }

      const response = await agent.handleUserMessage(message, context)
      
      // Update last activity
      await this.updateAgentActivity(userId)
      
      return response
      
    } catch (error) {
      console.error(`Error handling message for user ${userId}:`, error)
      
      // Log error
      await supabase.from('agent_errors').insert({
        user_id: userId,
        error_type: 'message_handling',
        error_message: error.message,
        context: { message, context },
        created_at: new Date().toISOString()
      })
      
      throw error
    }
  }

  async getAgentStatus(userId) {
    try {
      const agent = this.activeAgents.get(userId)
      
      if (!agent) {
        return {
          exists: false,
          status: 'not_running',
          message: 'Agent not initialized'
        }
      }

      // Get detailed status from database
      const { data: statusData } = await supabase
        .from('agent_status')
        .select('*')
        .eq('user_id', userId)
        .single()

      // Get recent performance metrics
      const { data: recentDecisions } = await supabase
        .from('agent_decisions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      return {
        exists: true,
        status: agent.isActive ? 'active' : 'paused',
        agentType: 'unified',
        performance: agent.performanceMetrics,
        strategy: agent.currentStrategy?.summary,
        goals: agent.activeGoals?.length || 0,
        recentDecisions: recentDecisions?.length || 0,
        lastActivity: statusData?.last_activity,
        uptime: statusData?.started_at ? 
          Date.now() - new Date(statusData.started_at).getTime() : 0
      }
      
    } catch (error) {
      console.error(`Error getting agent status for user ${userId}:`, error)
      return {
        exists: false,
        status: 'error',
        error: error.message
      }
    }
  }

  async getAgentGoals(userId) {
    const agent = this.activeAgents.get(userId)
    if (agent && agent.activeGoals) {
      return agent.activeGoals
    }
    
    // Fallback to database
    const { data, error } = await supabase
      .from('agent_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('priority', { ascending: false })
    
    return data || []
  }

  async getAgentDecisions(userId, limit = 10) {
    const { data, error } = await supabase
      .from('agent_decisions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return data || []
  }

  async processDecisionFeedback(userId, decisionId, feedback) {
    try {
      const agent = this.activeAgents.get(userId)
      if (agent) {
        return await agent.processUserFeedback(decisionId, feedback)
      }
      
      // Store feedback for when agent starts
      await supabase.from('agent_decision_feedback').insert({
        decision_id: decisionId,
        user_id: userId,
        feedback: feedback,
        created_at: new Date().toISOString()
      })
      
      return { success: true, message: 'Feedback stored for processing' }
      
    } catch (error) {
      console.error('Error processing decision feedback:', error)
      throw error
    }
  }

  // === SYSTEM MANAGEMENT ===

  async getSystemStatus() {
    const activeAgents = Array.from(this.activeAgents.keys())
    
    return {
      isRunning: this.isRunning,
      totalAgents: this.activeAgents.size,
      activeAgentIds: activeAgents,
      performanceMetrics: this.performanceMetrics,
      systemHealth: this.performanceMetrics.systemHealth,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    }
  }

  async updatePerformanceMetrics() {
    try {
      // Get aggregate metrics from all agents
      let totalDecisions = 0
      let totalSuccessRate = 0
      let validAgents = 0

      for (const agent of this.activeAgents.values()) {
        if (agent.performanceMetrics) {
          totalDecisions += agent.performanceMetrics.applicationsGenerated || 0
          if (agent.performanceMetrics.successRate > 0) {
            totalSuccessRate += agent.performanceMetrics.successRate
            validAgents++
          }
        }
      }

      this.performanceMetrics.totalDecisions = totalDecisions
      this.performanceMetrics.avgSuccessRate = validAgents > 0 ? 
        totalSuccessRate / validAgents : 0
      this.performanceMetrics.activeAgents = this.activeAgents.size

      // Store metrics in database
      await supabase.from('system_metrics').insert({
        metric_type: 'agent_performance',
        data: this.performanceMetrics,
        created_at: new Date().toISOString()
      })

    } catch (error) {
      console.error('Error updating performance metrics:', error)
    }
  }

  async broadcastToAllAgents(message, actionType = 'notification') {
    console.log(`📢 Broadcasting ${actionType} to ${this.activeAgents.size} agents: ${message}`)
    
    const results = []
    
    for (const [userId, agent] of this.activeAgents) {
      try {
        let result
        
        switch (actionType) {
          case 'pause':
            result = await agent.pause()
            break
          case 'resume':
            result = await agent.resume()
            break
          case 'update_strategy':
            // Trigger strategy update for all agents
            result = await agent.updateStrategy()
            break
          default:
            // Send notification
            result = await agent.notifyUser('system_broadcast', {
              message,
              timestamp: new Date().toISOString()
            })
        }
        
        results.push({ userId, status: 'success', result })
        
      } catch (error) {
        console.error(`Error broadcasting to agent ${userId}:`, error)
        results.push({ userId, status: 'error', error: error.message })
      }
    }
    
    await this.logManagerActivity('broadcast', {
      message,
      actionType,
      results,
      totalAgents: this.activeAgents.size
    })
    
    return results
  }

  // === LOGGING & MONITORING ===

  async updateAgentActivity(userId) {
    try {
      await supabase.from('agent_status').update({
        last_activity: new Date().toISOString()
      }).eq('user_id', userId)
    } catch (error) {
      console.error('Error updating agent activity:', error)
    }
  }

  async logHealthReport(healthReport) {
    try {
      await supabase.from('system_health_reports').insert({
        report_data: healthReport,
        system_health: healthReport.systemHealth,
        healthy_agents: healthReport.healthyAgents,
        total_agents: healthReport.totalAgents,
        created_at: healthReport.timestamp
      })
    } catch (error) {
      console.error('Error logging health report:', error)
    }
  }

  async logManagerActivity(activity, data = {}) {
    try {
      await supabase.from('agent_manager_log').insert({
        activity_type: activity,
        data: data,
        metrics: this.performanceMetrics,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error logging manager activity:', error)
    }
  }

  async sendHealthAlert(healthReport) {
    if (process.env.ADMIN_EMAILS) {
      const adminEmails = process.env.ADMIN_EMAILS.split(',')
      
      // Implementation would depend on your email service
      console.log('🚨 Health alert needed:', healthReport.systemHealth)
      console.log(`Healthy agents: ${healthReport.healthyAgents}/${healthReport.totalAgents}`)
    }
  }

  // === CLEANUP ===

  async stop() {
    console.log('🛑 Stopping Unified Agent Manager')
    
    try {
      // Clear health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }
      
      // Stop all agents gracefully
      const stopPromises = Array.from(this.activeAgents.keys()).map(userId => 
        this.stopAgentForUser(userId)
      )
      
      await Promise.allSettled(stopPromises)
      
      // Clear the agents map
      this.activeAgents.clear()
      
      // Update state
      this.isRunning = false
      this.performanceMetrics.activeAgents = 0
      
      // Log shutdown
      await this.logManagerActivity('stopped', {
        shutdownTime: new Date().toISOString(),
        finalMetrics: this.performanceMetrics
      })
      
      console.log('✅ Unified Agent Manager stopped successfully')
      
    } catch (error) {
      console.error('Error during manager shutdown:', error)
    }
  }

  async gracefulShutdown() {
    console.log('🔄 Initiating graceful shutdown...')
    
    try {
      // Notify all agents of shutdown
      await this.broadcastToAllAgents('System maintenance - agents will restart shortly', 'notification')
      
      // Wait for notifications to process
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Stop everything
      await this.stop()
      
      console.log('✅ Graceful shutdown completed')
      
    } catch (error) {
      console.error('Error during graceful shutdown:', error)
      await this.stop()
    }
  }
}

// Singleton instance
const unifiedAgentManager = new UnifiedAgentManager()

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  unifiedAgentManager.gracefulShutdown()
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...')
  unifiedAgentManager.gracefulShutdown()
})

export { unifiedAgentManager, UnifiedAgentManager }