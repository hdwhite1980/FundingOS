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
    
    // Initialize memory object with store method
    this.memory = {
      store: (key, value) => {
        this.workingMemory.set(key, value)
        return value
      },
      get: (key) => {
        return this.workingMemory.get(key)
      },
      clear: () => {
        this.workingMemory.clear()
      }
    }
    
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

  // === USER MESSAGE HANDLING ===

  async handleUserMessage(message, context = {}) {
    try {
      console.log(`🤖 Processing message for agent ${this.agentId}: ${message}`)
      
      // Ensure agent is active
      if (!this.isActive) {
        await this.resume()
      }

      // Analyze the user message to determine intent
      const intent = await this.analyzeUserIntent(message, context)
      
      let response = {
        message: '',
        actions: [],
        data: null,
        intent: intent
      }

      // Handle different types of user requests
      switch (intent.type) {
        case 'project_summary':
          response = await this.handleProjectSummaryRequest(context.projects || [])
          break
          
        case 'opportunity_search':
          response = await this.handleOpportunitySearchRequest(intent.parameters, context)
          break
          
        case 'funding_strategy':
          response = await this.handleStrategyRequest(context.projects || [])
          break
          
        case 'application_help':
          response = await this.handleApplicationHelpRequest(intent.parameters, context)
          break
          
        case 'status_check':
          response = await this.handleStatusRequest()
          break
          
        default:
          response = await this.handleGeneralQuery(message, context)
      }

      // Update memory with the interaction
      this.memory.store(`lastInteraction`, {
        message,
        response: response.message,
        timestamp: new Date().toISOString(),
        intent
      })

      return response

    } catch (error) {
      console.error('Error handling user message:', error)
      return {
        message: "I'm experiencing some technical difficulties. Let me continue working on your funding strategy in the background.",
        error: error.message,
        actions: []
      }
    }
  }

  async analyzeUserIntent(message, context) {
    const lowerMessage = message.toLowerCase()
    
    // Simple intent detection - can be enhanced with AI
    if (lowerMessage.includes('project') && (lowerMessage.includes('summary') || lowerMessage.includes('overview'))) {
      return { type: 'project_summary', confidence: 0.9 }
    }
    
    if (lowerMessage.includes('opportunity') || lowerMessage.includes('grant') || lowerMessage.includes('funding')) {
      return { type: 'opportunity_search', confidence: 0.8 }
    }
    
    if (lowerMessage.includes('strategy') || lowerMessage.includes('plan')) {
      return { type: 'funding_strategy', confidence: 0.8 }
    }
    
    if (lowerMessage.includes('application') || lowerMessage.includes('apply')) {
      return { type: 'application_help', confidence: 0.7 }
    }
    
    if (lowerMessage.includes('status') || lowerMessage.includes('progress')) {
      return { type: 'status_check', confidence: 0.9 }
    }
    
    return { type: 'general_query', confidence: 0.5 }
  }

  async handleProjectSummaryRequest(projects) {
    if (!projects || projects.length === 0) {
      return {
        message: "I don't see any projects in your portfolio yet. Would you like me to help you create your first project?",
        actions: ['suggest_create_project'],
        data: { projectCount: 0 }
      }
    }

    const projectSummaries = projects.map(project => {
      return `• **${project.name || project.title}**: ${project.description || 'No description available'}`
    }).join('\n')

    return {
      message: `Here's a summary of your ${projects.length} project${projects.length > 1 ? 's' : ''}:\n\n${projectSummaries}\n\nWould you like me to search for funding opportunities for any of these projects?`,
      actions: ['show_projects', 'search_opportunities'],
      data: { 
        projectCount: projects.length,
        projects: projects.map(p => ({ id: p.id, name: p.name || p.title }))
      }
    }
  }

  async handleOpportunitySearchRequest(parameters, context) {
    try {
      const opportunities = await this.searchOpportunities({
        query: parameters?.query || 'general funding',
        limit: 5
      })

      if (opportunities.length === 0) {
        return {
          message: "I couldn't find any immediate opportunities matching your criteria. Let me continue monitoring for new opportunities in the background.",
          actions: ['continue_monitoring'],
          data: { opportunityCount: 0 }
        }
      }

      const opportunitySummary = opportunities.slice(0, 3).map(opp => 
        `• **${opp.title}**: ${opp.description?.substring(0, 100)}...`
      ).join('\n')

      return {
        message: `I found ${opportunities.length} potential opportunities:\n\n${opportunitySummary}\n\nWould you like me to analyze these opportunities for your projects?`,
        actions: ['analyze_opportunities', 'show_all_opportunities'],
        data: { 
          opportunityCount: opportunities.length,
          opportunities: opportunities.slice(0, 3)
        }
      }
    } catch (error) {
      return {
        message: "I'm having trouble accessing the opportunity database right now. Let me continue searching in the background.",
        actions: ['retry_search'],
        error: error.message
      }
    }
  }

  async handleStrategyRequest(projects) {
    try {
      const strategy = await this.generateStrategy(
        { projects: projects || [] }, 
        { type: 'comprehensive', timeline: '6_months' }
      )

      return {
        message: `Based on your projects, here's my recommended funding strategy:\n\n${strategy.summary}\n\nKey priorities:\n${strategy.priorities?.map(p => `• ${p}`).join('\n') || '• Comprehensive opportunity analysis\n• Application optimization\n• Deadline management'}`,
        actions: ['implement_strategy', 'modify_strategy'],
        data: { strategy }
      }
    } catch (error) {
      return {
        message: "I'm developing a comprehensive funding strategy for you. This will be ready shortly as I continue analyzing opportunities in the background.",
        actions: ['continue_strategy_development'],
        error: error.message
      }
    }
  }

  async handleApplicationHelpRequest(parameters, context) {
    return {
      message: "I can help you with application development! I can:\n\n• Analyze application requirements\n• Generate tailored content\n• Track deadlines\n• Optimize for success\n\nWhat specific help do you need with your application?",
      actions: ['show_application_tools', 'start_application_wizard'],
      data: { availableTools: ['analyzer', 'generator', 'tracker', 'optimizer'] }
    }
  }

  async handleStatusRequest() {
    return {
      message: `I'm actively working on your funding strategy! Current status:\n\n• Monitoring opportunities: ${this.isActive ? '✅ Active' : '⏸️ Paused'}\n• Strategy: ${this.strategy?.type || 'In Development'}\n• Last updated: ${new Date().toLocaleString()}\n\nI'll continue working in the background to find the best opportunities for you.`,
      actions: ['view_detailed_status', 'modify_settings'],
      data: { 
        isActive: this.isActive,
        strategy: this.strategy,
        lastUpdate: new Date().toISOString()
      }
    }
  }

  async handleGeneralQuery(message, context) {
    return {
      message: `I understand you're asking about "${message}". I'm your AI funding assistant, and I can help you with:\n\n• Finding funding opportunities\n• Developing funding strategies\n• Analyzing grant applications\n• Managing project portfolios\n\nHow can I assist you today?`,
      actions: ['show_capabilities', 'start_funding_search'],
      data: { originalQuery: message }
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