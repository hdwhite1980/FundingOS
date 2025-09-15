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
      
      // CHECK FOR WEB DISCOVERY FIRST - before any other routing or intent analysis
      const lowerMessage = message.toLowerCase()
      if (lowerMessage.includes('search') && lowerMessage.includes('internet') || 
          lowerMessage.includes('web search') || 
          lowerMessage.includes('find new') || 
          lowerMessage.includes('discover opportunities')) {
        console.log(`🌐 Early web discovery detection triggered for: "${message}"`)
        return await this.handleWebDiscoveryRequest(message, context)
      }
      
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
      // Use the real opportunities data passed in from context
      const allOpportunities = context.opportunities || []
      console.log(`📊 Processing ${allOpportunities.length} real opportunities from context`)
      
      if (allOpportunities.length === 0) {
        return {
          message: "I don't see any opportunities loaded yet. Let me refresh the opportunity database for you.",
          actions: ['refresh_opportunities'],
          data: { opportunityCount: 0 }
        }
      }

      // Filter for recent opportunities (added within last 30 days) or show all if "new" is requested
      const lowerMessage = parameters?.originalMessage?.toLowerCase() || ''
      let filteredOpportunities = allOpportunities
      
      if (lowerMessage.includes('new')) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        filteredOpportunities = allOpportunities.filter(opp => 
          new Date(opp.created_at || opp.date_added || opp.posted_date || '2024-01-01') >= thirtyDaysAgo
        )
      }

      // Sort by relevance or date
      filteredOpportunities.sort((a, b) => {
        // Prioritize by fit score if available
        if (a.fit_score && b.fit_score) {
          return b.fit_score - a.fit_score
        }
        // Otherwise sort by deadline proximity
        const aDeadline = new Date(a.deadline_date || a.deadline || '2030-01-01')
        const bDeadline = new Date(b.deadline_date || b.deadline || '2030-01-01')
        return aDeadline - bDeadline
      })

      const topOpportunities = filteredOpportunities.slice(0, 5)
      
      if (topOpportunities.length === 0) {
        return {
          message: `I found ${allOpportunities.length} total opportunities, but no new ones matching your criteria. Here are some recent opportunities you might be interested in:`,
          actions: ['show_recent_opportunities'],
          data: { 
            opportunityCount: allOpportunities.length,
            filteredCount: 0,
            opportunities: allOpportunities.slice(0, 3).map(opp => ({
              id: opp.id,
              title: opp.title,
              agency: opp.agency,
              deadline: opp.deadline_date || opp.deadline,
              amount: opp.estimated_funding || opp.award_ceiling
            }))
          }
        }
      }

      const opportunitySummary = topOpportunities.map(opp => {
        const deadline = opp.deadline_date || opp.deadline
        const amount = opp.estimated_funding || opp.award_ceiling
        return `• **${opp.title}** (${opp.agency || 'Federal'})
   ${deadline ? `Deadline: ${new Date(deadline).toLocaleDateString()}` : 'Open deadline'} ${amount ? `| Up to $${parseInt(amount).toLocaleString()}` : ''}`
      }).join('\n\n')

      const isNewSearch = lowerMessage.includes('new')
      const messagePrefix = isNewSearch ? 'new funding opportunities' : 'relevant funding opportunities'

      return {
        message: `I found **${topOpportunities.length}** ${messagePrefix} for you:\n\n${opportunitySummary}\n\n${filteredOpportunities.length > 5 ? `Plus ${filteredOpportunities.length - 5} more opportunities available. ` : ''}Would you like me to analyze how these match your projects?`,
        actions: ['analyze_fit_scores', 'show_all_opportunities', 'filter_by_agency'],
        data: { 
          opportunityCount: topOpportunities.length,
          totalCount: allOpportunities.length,
          filteredCount: filteredOpportunities.length,
          opportunities: topOpportunities.map(opp => ({
            id: opp.id,
            title: opp.title,
            agency: opp.agency,
            deadline: opp.deadline_date || opp.deadline,
            amount: opp.estimated_funding || opp.award_ceiling,
            description: opp.description,
            fitScore: opp.fit_score
          }))
        }
      }
    } catch (error) {
      console.error('Opportunity search error:', error)
      return {
        message: "I'm having trouble analyzing the opportunities right now, but I can see your data is loaded. Let me try a different approach.",
        actions: ['retry_search', 'show_raw_data'],
        error: error.message,
        data: { 
          opportunityCount: context.opportunities?.length || 0,
          hasContext: !!context.opportunities
        }
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
    // Check web discovery requests FIRST (before general funding keywords)
    const lowerMessage = message.toLowerCase()
    
    // Check for web discovery requests - these take priority
    if (lowerMessage.includes('search') && lowerMessage.includes('internet') || 
        lowerMessage.includes('find new') || 
        lowerMessage.includes('discover opportunities') || 
        lowerMessage.includes('web search')) {
      return await this.handleWebDiscoveryRequest(message, context)
    }
    
    // Then check if this might be an opportunity-related query that wasn't caught
    if (lowerMessage.includes('grant') || lowerMessage.includes('funding') || lowerMessage.includes('opportunity')) {
      // Redirect to opportunity search with the original message
      return await this.handleOpportunitySearchRequest({ 
        originalMessage: message,
        query: message 
      }, context)
    }
    
    // Provide contextual information if we have data
    const contextInfo = []
    if (context.projects?.length > 0) {
      contextInfo.push(`• ${context.projects.length} project${context.projects.length > 1 ? 's' : ''} in your portfolio`)
    }
    if (context.opportunities?.length > 0) {
      contextInfo.push(`• ${context.opportunities.length} funding opportunities available`)
    }
    if (context.submissions?.length > 0) {
      contextInfo.push(`• ${context.submissions.length} application${context.submissions.length > 1 ? 's' : ''} in progress`)
    }
    
    const contextSummary = contextInfo.length > 0 ? 
      `\n\nHere's what I can see in your account:\n${contextInfo.join('\n')}\n` : '\n'

    return {
      message: `I understand you're asking about "${message}". I'm your AI funding assistant with access to your complete portfolio.${contextSummary}\nI can help you with:\n\n• **Finding funding opportunities** - I have access to current grants and programs\n• **Developing funding strategies** - Based on your specific projects\n• **Analyzing grant applications** - Improving your success rate\n• **Managing project portfolios** - Tracking progress and deadlines\n\nWhat would you like to explore?`,
      actions: ['show_opportunities', 'analyze_projects', 'start_funding_search'],
      data: { 
        originalQuery: message,
        hasProjects: (context.projects?.length || 0) > 0,
        hasOpportunities: (context.opportunities?.length || 0) > 0,
        hasSubmissions: (context.submissions?.length || 0) > 0
      }
    }
  }

  async handleWebDiscoveryRequest(message, context) {
    try {
      console.log(`🌐 Processing web discovery request: "${message}"`)
      
      // Extract search parameters from the message
      const searchQuery = this.extractSearchQuery(message)
      const userProjects = context.projects || []
      const organizationType = context.user?.organization_type || 'nonprofit'
      
      console.log(`🔍 Initiating AI web discovery for: "${searchQuery}"`)
      
      // Call the AI discovery API - construct full URL for server-side calls
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 
                     process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                     process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` :
                     'http://localhost:5000'
      
      const discoveryResponse = await fetch(`${baseUrl}/api/ai/discover-opportunities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: context.userId || this.userId,
          searchQuery,
          projectType: this.inferProjectType(userProjects),
          organizationType,
          userProjects,
          searchDepth: 'comprehensive'
        })
      })

      if (!discoveryResponse.ok) {
        throw new Error(`Discovery API error: ${discoveryResponse.status}`)
      }

      const discoveryResults = await discoveryResponse.json()
      
      if (discoveryResults.success) {
        const { opportunitiesFound, opportunities } = discoveryResults
        
        let responseMessage = `🎉 **Web Discovery Complete!**\n\nI searched the internet and found **${opportunitiesFound} new funding opportunities** for your projects!\n\n`
        
        if (opportunitiesFound > 0) {
          responseMessage += `**Top Discoveries:**\n`
          
          // Show top 3 opportunities
          const topOpportunities = opportunities.slice(0, 3)
          for (const opp of topOpportunities) {
            responseMessage += `\n🏆 **${opp.title}**\n`
            responseMessage += `   💰 Funding: ${opp.amount_max ? `Up to $${opp.amount_max.toLocaleString()}` : 'Amount varies'}\n`
            responseMessage += `   📅 Deadline: ${opp.deadline_date || 'Rolling deadline'}\n`
            responseMessage += `   🎯 Fit Score: ${opp.fit_score || 'Not scored'}%\n`
            if (opp.matching_projects?.length > 0) {
              responseMessage += `   📁 Matches: ${opp.matching_projects.map(p => p.name).join(', ')}\n`
            }
          }
          
          if (opportunitiesFound > 3) {
            responseMessage += `\n...and ${opportunitiesFound - 3} more opportunities!\n`
          }
          
          responseMessage += `\n**All discoveries have been added to your opportunities database.** You can view them in your dashboard or ask me for more details about any specific opportunity.`
        } else {
          responseMessage += `I thoroughly searched the web but didn't find any new opportunities matching your criteria. You might want to try:\n\n• Different search terms\n• Broader project categories\n• Alternative funding types\n\nI'll keep monitoring for new opportunities automatically!`
        }
        
        return {
          message: responseMessage,
          actions: opportunitiesFound > 0 ? ['view_discoveries', 'analyze_fit', 'start_applications'] : ['refine_search', 'try_different_terms'],
          data: {
            discoveryResults,
            searchQuery,
            opportunitiesFound,
            opportunities: opportunities?.slice(0, 5) // Limit data size
          }
        }
      } else {
        throw new Error(discoveryResults.message || 'Discovery failed')
      }
      
    } catch (error) {
      console.error('❌ Web discovery error:', error)
      
      return {
        message: `I encountered an issue while searching the web for opportunities:\n\n**Error:** ${error.message}\n\nI can still help you with:\n• Searching existing opportunities in our database\n• Analyzing your current projects\n• Providing funding strategy advice\n\nWould you like me to search our existing opportunity database instead?`,
        actions: ['search_existing_opportunities', 'analyze_projects', 'get_funding_advice'],
        data: { 
          error: error.message,
          fallbackAvailable: true
        }
      }
    }
  }
  
  extractSearchQuery(message) {
    // Remove common web discovery trigger words to get the core search query
    const cleanMessage = message
      .replace(/search (the )?internet for|find new|discover opportunities|web search for|look for|can you|could you|please/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    
    // If nothing meaningful remains, use default search terms
    if (cleanMessage.length < 4 || cleanMessage.toLowerCase().includes('opportunities') || cleanMessage.toLowerCase().includes('funding')) {
      return 'funding opportunities grants'
    }
    
    return cleanMessage
  }
  
  inferProjectType(userProjects) {
    if (!userProjects || userProjects.length === 0) return null
    
    // Look for common project types in the user's projects
    const projectTypes = userProjects.map(p => p.project_type || p.category || '').filter(Boolean)
    if (projectTypes.length === 0) return null
    
    // Return the most common project type
    const typeCounts = {}
    projectTypes.forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })
    
    return Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b)
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