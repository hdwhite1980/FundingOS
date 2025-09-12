// lib/ai-agent/UnifiedAgent.js
// Unified AI Agent using server-side API endpoints

import { supabase } from '../supabase.js'
import { MailgunEmailService } from '../email-service.js'

class UnifiedFundingAgent {
  constructor(userId) {
    this.userId = userId
    this.emailService = new MailgunEmailService()
    this.apiBaseUrl = '/api/ai/unified-agent'  // Fixed: changed from /api/ai/agent to /api/ai/unified-agent
    
    // Agent State
    this.isActive = true
    this.currentStrategy = null
    this.activeGoals = []
    this.workingMemory = new Map()
    this.decisionHistory = []
    this.performanceMetrics = {
      opportunitiesDiscovered: 0,
      applicationsGenerated: 0,
      successRate: 0,
      userSatisfaction: 0,
      automationLevel: 0
    }
    
    this.agentId = `unified-agent-${userId}`
    this.lastActiveTime = new Date().toISOString()
  }

  // === CORE AGENT OPERATIONS ===

  async initialize() {
    try {
      // Check if we're in a server environment (no window object)
      if (typeof window === 'undefined') {
        console.log(`🔧 Server-side initialization for agent ${this.agentId}`)
        return this.initializeServerSide()
      }

      // Client-side initialization with API call
      const response = await fetch(`${this.apiBaseUrl}/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          agentId: this.agentId
        })
      })

      if (!response.ok) {
        throw new Error(`Agent initialization failed: ${response.status}`)
      }

      const result = await response.json()
      this.currentStrategy = result.data?.strategy || null
      this.isActive = true
      
      console.log(`✅ Unified Agent ${this.agentId} initialized`)
      return result.data
    } catch (error) {
      console.error('Agent initialization error:', error)
      return this.initializeFallback()
    }
  }

  async initializeServerSide() {
    try {
      // Direct server-side initialization without HTTP calls
      this.isActive = true
      this.lastActiveTime = new Date().toISOString()
      
      // Initialize default strategy
      this.currentStrategy = {
        type: 'proactive_discovery',
        priority: 'medium',
        focus_areas: ['grants', 'opportunities'],
        automation_level: 0.7
      }

      // Set default goals
      this.activeGoals = [
        {
          type: 'discovery',
          description: 'Find new funding opportunities',
          priority: 'high',
          status: 'active'
        }
      ]

      console.log(`✅ Server-side initialization complete for agent ${this.agentId}`)
      return {
        success: true,
        strategy: this.currentStrategy,
        goals: this.activeGoals,
        status: 'active'
      }
    } catch (error) {
      console.error('Server-side initialization error:', error)
      return this.initializeFallback()
    }
  }

  async generateStrategy(userContext, goals) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/generate-strategy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          userContext,
          goals,
          agentId: this.agentId
        })
      })

      if (!response.ok) {
        throw new Error(`Strategy generation failed: ${response.status}`)
      }

      const result = await response.json()
      this.currentStrategy = result.data
      return result.data
    } catch (error) {
      console.error('Strategy generation error:', error)
      return this.generateBasicStrategy(userContext, goals)
    }
  }

  async executeStrategy() {
    if (!this.currentStrategy) {
      console.warn('No strategy to execute')
      return { success: false, message: 'No active strategy' }
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/execute-strategy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          strategy: this.currentStrategy,
          agentId: this.agentId
        })
      })

      if (!response.ok) {
        throw new Error(`Strategy execution failed: ${response.status}`)
      }

      const result = await response.json()
      this.updateMetrics(result.data?.metrics)
      return result.data
    } catch (error) {
      console.error('Strategy execution error:', error)
      return { success: false, message: 'Strategy execution failed', error: error.message }
    }
  }

  async searchOpportunities(criteria) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/search-opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          criteria,
          agentId: this.agentId
        })
      })

      if (!response.ok) {
        throw new Error(`Opportunity search failed: ${response.status}`)
      }

      const result = await response.json()
      this.performanceMetrics.opportunitiesDiscovered += result.data?.opportunities?.length || 0
      return result.data
    } catch (error) {
      console.error('Opportunity search error:', error)
      return { opportunities: [], message: 'Search failed', error: error.message }
    }
  }

  async generateApplication(opportunity, projectData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/generate-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          opportunity,
          projectData,
          agentId: this.agentId
        })
      })

      if (!response.ok) {
        throw new Error(`Application generation failed: ${response.status}`)
      }

      const result = await response.json()
      this.performanceMetrics.applicationsGenerated++
      return result.data
    } catch (error) {
      console.error('Application generation error:', error)
      return { 
        success: false, 
        message: 'Application generation failed', 
        error: error.message 
      }
    }
  }

  // === AGENT LEARNING & ADAPTATION ===

  async learn(feedback) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/learn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          feedback,
          agentId: this.agentId,
          currentStrategy: this.currentStrategy
        })
      })

      if (!response.ok) {
        throw new Error(`Learning failed: ${response.status}`)
      }

      const result = await response.json()
      
      // Update agent based on learning
      if (result.data?.updatedStrategy) {
        this.currentStrategy = result.data.updatedStrategy
      }
      
      return result.data
    } catch (error) {
      console.error('Agent learning error:', error)
      return { success: false, message: 'Learning failed' }
    }
  }

  // === FALLBACK METHODS ===

  initializeFallback() {
    this.currentStrategy = {
      name: 'Basic Strategy (Fallback)',
      goals: ['Find funding opportunities', 'Assist with applications'],
      actions: ['Monitor opportunities', 'Provide recommendations'],
      timeline: 'Ongoing'
    }
    
    return {
      success: true,
      message: 'Agent initialized in fallback mode',
      strategy: this.currentStrategy
    }
  }

  generateBasicStrategy(userContext, goals) {
    const strategy = {
      name: 'Basic Funding Strategy',
      created: new Date().toISOString(),
      goals: goals || [
        'Identify suitable funding opportunities',
        'Prepare application materials',
        'Track deadlines and requirements'
      ],
      actions: [
        'Search funding databases',
        'Analyze opportunity fit',
        'Generate application drafts',
        'Send deadline reminders'
      ],
      timeline: '3-6 months',
      confidence: 0.6,
      fallback: true
    }

    this.currentStrategy = strategy
    return strategy
  }

  // === UTILITY METHODS ===

  updateMetrics(newMetrics) {
    if (newMetrics) {
      Object.assign(this.performanceMetrics, newMetrics)
    }
    this.lastActiveTime = new Date().toISOString()
  }

  getStatus() {
    return {
      agentId: this.agentId,
      userId: this.userId,
      isActive: this.isActive,
      currentStrategy: this.currentStrategy?.name || 'None',
      activeGoals: this.activeGoals.length,
      performanceMetrics: this.performanceMetrics,
      lastActiveTime: this.lastActiveTime,
      workingMemorySize: this.workingMemory.size,
      decisionCount: this.decisionHistory.length
    }
  }

  async pause() {
    this.isActive = false
    console.log(`⏸️ Unified Agent ${this.agentId} paused`)
  }

  async resume() {
    this.isActive = true
    console.log(`▶️ Unified Agent ${this.agentId} resumed`)
  }

  async shutdown() {
    try {
      // Save state before shutdown
      await this.saveAgentState()
      
      this.isActive = false
      this.workingMemory.clear()
      
      console.log(`🛑 Unified Agent ${this.agentId} shutdown`)
      return { success: true, message: 'Agent shutdown complete' }
    } catch (error) {
      console.error('Agent shutdown error:', error)
      return { success: false, message: 'Shutdown error', error: error.message }
    }
  }

  async saveAgentState() {
    try {
      const state = {
        agentId: this.agentId,
        userId: this.userId,
        currentStrategy: this.currentStrategy,
        performanceMetrics: this.performanceMetrics,
        lastActiveTime: this.lastActiveTime,
        isActive: this.isActive
      }

      const { error } = await supabase
        .from('agent_states')
        .upsert(state, { onConflict: 'agentId' })

      if (error) throw error
      
      console.log('✅ Agent state saved')
    } catch (error) {
      console.error('Failed to save agent state:', error)
    }
  }

  async loadAgentState() {
    try {
      const { data, error } = await supabase
        .from('agent_states')
        .select('*')
        .eq('agentId', this.agentId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        this.currentStrategy = data.currentStrategy
        this.performanceMetrics = data.performanceMetrics || this.performanceMetrics
        this.lastActiveTime = data.lastActiveTime
        this.isActive = data.isActive !== false
        
        console.log('✅ Agent state loaded')
        return data
      }
      
      return null
    } catch (error) {
      console.error('Failed to load agent state:', error)
      return null
    }
  }

  // === TEST METHODS ===

  async testConnection() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: this.agentId,
          test: 'connection'
        })
      })

      return response.ok
    } catch (error) {
      console.error('Agent connection test failed:', error)
      return false
    }
  }
}

// === SIMPLIFIED HELPER CLASSES ===

class AgentMemorySystem {
  constructor(userId) {
    this.userId = userId
    this.shortTermMemory = new Map()
    this.longTermMemory = new Map()
  }

  store(key, value, persistent = false) {
    if (persistent) {
      this.longTermMemory.set(key, value)
    } else {
      this.shortTermMemory.set(key, value)
    }
  }

  recall(key) {
    return this.longTermMemory.get(key) || this.shortTermMemory.get(key)
  }

  clear() {
    this.shortTermMemory.clear()
  }
}

export default UnifiedFundingAgent
export { UnifiedFundingAgent }