// lib/ai-agent/UnifiedAgent.js
// Single Autonomous AI Agent Managing Complete Funding Ecosystem

import { supabase } from '../supabase.js'
import { MailgunEmailService } from '../email-service.js'
import OpenAI from 'openai'

class UnifiedFundingAgent {
  constructor(userId) {
    this.userId = userId
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.emailService = new MailgunEmailService()
    
    // Agent Core Systems
    this.memory = new AgentMemorySystem(userId)
    this.reasoner = new UnifiedReasoner(this.openai, this.memory)
    this.executor = new UnifiedActionExecutor(this.memory, this.emailService)
    this.learner = new AdaptiveLearner(this.openai, this.memory)
    
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
    
    // Autonomous Operation Intervals
    this.mainLoop = null
    this.monitoringLoop = null
    this.learningLoop = null
  }

  // === MAIN AUTONOMOUS OPERATION ===
  
  async initialize() {
    console.log(`🤖 Initializing Unified AI Funding Agent for user ${this.userId}`)
    
    try {
      // Load comprehensive user context
      await this.memory.loadCompleteUserContext()
      
      // Analyze current situation and set strategy
      const situationAnalysis = await this.reasoner.analyzeFundingSituation()
      this.currentStrategy = await this.reasoner.developComprehensiveStrategy(situationAnalysis)
      
      // Set adaptive goals based on strategy
      this.activeGoals = await this.setAdaptiveGoals(this.currentStrategy)
      
      // Start autonomous operations
      this.startAutonomousOperations()
      
      // Send initialization notification
      await this.notifyUser('agent_initialized', {
        strategy: this.currentStrategy.summary,
        goals: this.activeGoals.length,
        capabilities: this.getCapabilitiesList()
      })
      
      console.log(`✅ Unified Agent initialized with ${this.activeGoals.length} goals`)
      return { success: true, strategy: this.currentStrategy }
      
    } catch (error) {
      console.error('Agent initialization error:', error)
      throw error
    }
  }

  startAutonomousOperations() {
    console.log('🚀 Starting autonomous operations...')
    
    // Main decision-making and action loop (every 15 minutes)
    this.mainLoop = setInterval(async () => {
      try {
        await this.executeMainLoop()
      } catch (error) {
        console.error('Main loop error:', error)
      }
    }, 15 * 60 * 1000)
    
    // Continuous monitoring loop (every 5 minutes)
    this.monitoringLoop = setInterval(async () => {
      try {
        await this.executeMonitoringLoop()
      } catch (error) {
        console.error('Monitoring loop error:', error)
      }
    }, 5 * 60 * 1000)
    
    // Learning and adaptation loop (every hour)
    this.learningLoop = setInterval(async () => {
      try {
        await this.executeLearningLoop()
      } catch (error) {
        console.error('Learning loop error:', error)
      }
    }, 60 * 60 * 1000)
  }

  async executeMainLoop() {
    console.log('🧠 Executing main decision loop...')
    
    // 1. Refresh context and assess current situation
    await this.memory.refreshUserContext()
    const situation = await this.reasoner.assessCurrentSituation()
    
    // 2. Make strategic decisions
    const decisions = await this.reasoner.makeStrategicDecisions(situation, this.currentStrategy)
    
    // 3. Execute high-priority actions
    const results = await this.executor.executeDecisions(decisions)
    
    // 4. Update strategy based on results
    await this.updateStrategy(results, situation)
    
    // 5. Store experience for learning
    await this.memory.storeExperience({
      type: 'main_loop',
      situation,
      decisions,
      results,
      timestamp: new Date().toISOString()
    })
    
    // 6. Update performance metrics
    this.updatePerformanceMetrics(results)
  }

  async executeMonitoringLoop() {
    console.log('👁️ Executing monitoring loop...')
    
    // Monitor deadlines
    await this.monitorCriticalDeadlines()
    
    // Scan for new opportunities
    await this.scanForNewOpportunities()
    
    // Check funding progress
    await this.checkFundingProgress()
    
    // Monitor user engagement
    await this.monitorUserEngagement()
  }

  async executeLearningLoop() {
    console.log('📚 Executing learning loop...')
    
    // Analyze recent experiences
    const insights = await this.learner.analyzeRecentExperiences()
    
    // Update decision-making patterns
    await this.learner.updateDecisionPatterns(insights)
    
    // Adapt strategy based on learnings
    await this.adaptStrategy(insights)
    
    // Generate performance report
    await this.generatePerformanceReport()
  }

  // === OPPORTUNITY DISCOVERY & ANALYSIS ===
  
  async scanForNewOpportunities() {
    try {
      const userContext = await this.memory.getUserContext()
      const { projects, profile } = userContext
      
      if (!projects || projects.length === 0) return
      
      // Determine what types of opportunities to search for
      const searchStrategy = await this.reasoner.planOpportunitySearch(projects, profile)
      
      // Execute web search if needed
      if (searchStrategy.needsWebSearch) {
        const webResults = await this.executeWebSearch(searchStrategy)
        await this.processWebSearchResults(webResults)
      }
      
      // Analyze existing opportunities for new matches
      await this.reanalyzeExistingOpportunities(searchStrategy)
      
      // Update opportunity recommendations
      await this.updateOpportunityRecommendations()
      
    } catch (error) {
      console.error('Opportunity scanning error:', error)
    }
  }

  async executeWebSearch(searchStrategy) {
    const searches = []
    
    for (const query of searchStrategy.queries) {
      try {
        const response = await fetch('/api/ai/unified-agent/search-opportunities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: this.userId,
            searchQuery: query.text,
            projectType: query.projectType,
            organizationType: query.organizationType,
            location: query.location,
            fundingAmount: query.fundingAmount,
            searchDepth: 'thorough'
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          searches.push(result)
          this.performanceMetrics.opportunitiesDiscovered += result.opportunitiesFound
        }
      } catch (error) {
        console.error('Web search error for query:', query, error)
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    return searches
  }

  async processWebSearchResults(webResults) {
    for (const searchResult of webResults) {
      if (searchResult.opportunities) {
        for (const opportunity of searchResult.opportunities) {
          // Analyze each discovered opportunity
          await this.analyzeNewOpportunity(opportunity)
        }
      }
    }
  }

  async analyzeNewOpportunity(opportunity) {
    const userContext = await this.memory.getUserContext()
    const { projects, profile } = userContext
    
    for (const project of projects) {
      // Calculate detailed fit score
      const analysis = await this.reasoner.analyzeOpportunityFit(project, opportunity, profile)
      
      if (analysis.fitScore >= 70) {
        // High-value opportunity found
        await this.createOpportunityRecommendation(project, opportunity, analysis)
        
        // Consider automatic application generation for exceptional matches
        if (analysis.fitScore >= 90 && analysis.urgency === 'high') {
          await this.considerAutomaticApplicationGeneration(project, opportunity, analysis)
        }
      }
      
      // Store analysis for learning
      await this.memory.storeOpportunityAnalysis(project.id, opportunity.id, analysis)
    }
  }

  // === FUNDING STRATEGY MANAGEMENT ===
  
  async updateStrategy(actionResults, situation) {
    const currentPerformance = this.calculateStrategyPerformance()
    
    if (currentPerformance.effectiveness < 0.6) {
      console.log('Strategy performance below threshold, triggering adaptation...')
      
      const newStrategy = await this.reasoner.adaptStrategy(
        this.currentStrategy,
        actionResults,
        situation,
        currentPerformance
      )
      
      if (newStrategy.confidence > 0.7) {
        await this.implementNewStrategy(newStrategy)
      }
    }
  }

  async implementNewStrategy(newStrategy) {
    const oldStrategy = this.currentStrategy
    this.currentStrategy = newStrategy
    
    // Update goals to align with new strategy
    this.activeGoals = await this.setAdaptiveGoals(newStrategy)
    
    // Notify user of strategy change
    await this.notifyUser('strategy_updated', {
      oldStrategy: oldStrategy.summary,
      newStrategy: newStrategy.summary,
      reasoning: newStrategy.reasoning,
      expectedImpact: newStrategy.expectedImpact
    })
    
    // Store strategy evolution
    await this.memory.storeStrategyEvolution(oldStrategy, newStrategy)
  }

  // === AUTOMATED APPLICATION GENERATION ===
  
  async considerAutomaticApplicationGeneration(project, opportunity, analysis) {
    // Check user preferences for automation level
    const userPrefs = await this.memory.getUserPreferences()
    
    if (userPrefs.allowAutomaticApplications && analysis.confidence > 0.85) {
      try {
        // Generate application draft
        const applicationDraft = await this.generateApplicationDraft(project, opportunity, analysis)
        
        // Create decision for user review
        await this.createHighPriorityDecision('automatic_application_generated', {
          project: project.name,
          opportunity: opportunity.title,
          fitScore: analysis.fitScore,
          applicationDraft: applicationDraft,
          recommendation: 'Review and submit this auto-generated application',
          urgency: analysis.urgency,
          deadline: opportunity.deadline_date
        })
        
        this.performanceMetrics.applicationsGenerated++
        
      } catch (error) {
        console.error('Automatic application generation error:', error)
      }
    }
  }

  async generateApplicationDraft(project, opportunity, analysis) {
    const userContext = await this.memory.getUserContext()
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert grant writer generating a comprehensive application draft. Use all available context to create a compelling, tailored application.`
        },
        {
          role: "user",
          content: this.buildApplicationPrompt(project, opportunity, analysis, userContext)
        }
      ],
      temperature: 0.4,
      max_tokens: 4000
    })
    
    return response.choices[0].message.content
  }

  buildApplicationPrompt(project, opportunity, analysis, userContext) {
    return `
Create a comprehensive grant application for:

PROJECT: ${project.name}
- Type: ${project.project_type}
- Location: ${project.location}
- Funding Needed: $${project.funding_needed?.toLocaleString()}
- Description: ${project.description}

OPPORTUNITY: ${opportunity.title}
- Sponsor: ${opportunity.sponsor}
- Amount: ${opportunity.amount_max ? `Up to $${opportunity.amount_max.toLocaleString()}` : 'Varies'}
- Deadline: ${opportunity.deadline_date}

ORGANIZATION: ${userContext.profile?.organization_name}
- Type: ${userContext.profile?.organization_type}
- Location: ${userContext.profile?.city}, ${userContext.profile?.state}

AI ANALYSIS INSIGHTS:
- Fit Score: ${analysis.fitScore}%
- Key Strengths: ${analysis.strengths?.join('; ')}
- Recommendations: ${analysis.recommendations?.join('; ')}

Create a professional, compelling application with:
1. Executive Summary
2. Project Description & Need Statement
3. Goals & Objectives
4. Methodology & Timeline
5. Budget Justification
6. Organizational Capacity
7. Evaluation Plan
8. Sustainability Plan

Make it specific to this opportunity and organization.
    `
  }

  // === DEADLINE & PROGRESS MONITORING ===
  
  async monitorCriticalDeadlines() {
    const upcomingDeadlines = await this.getUpcomingDeadlines()
    
    for (const deadline of upcomingDeadlines) {
      const daysRemaining = Math.ceil((new Date(deadline.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      
      if (daysRemaining <= 3 && deadline.status !== 'submitted') {
        // Critical deadline alert
        await this.handleCriticalDeadline(deadline, daysRemaining)
      } else if (daysRemaining <= 7 && deadline.status !== 'in_progress') {
        // Urgent reminder
        await this.handleUrgentDeadline(deadline, daysRemaining)
      }
    }
  }

  async handleCriticalDeadline(deadline, daysRemaining) {
    // Create high-priority decision
    await this.createHighPriorityDecision('critical_deadline', {
      opportunity: deadline.opportunity_title,
      deadline: deadline.deadline_date,
      daysRemaining,
      status: deadline.status,
      recommendation: daysRemaining <= 1 ? 
        'Submit immediately with current materials' : 
        'Focus all resources on completing this application',
      urgency: 'CRITICAL'
    })
    
    // Send immediate email alert
    await this.emailService.sendCriticalDeadlineAlert(this.userId, deadline, daysRemaining)
  }

  async checkFundingProgress() {
    const fundingStats = await this.memory.getFundingStatistics()
    const targetProgress = await this.calculateExpectedProgress()
    
    if (fundingStats.progressPercentage < targetProgress * 0.8) {
      // Behind target - take corrective action
      await this.handleBehindTargetProgress(fundingStats, targetProgress)
    } else if (fundingStats.progressPercentage > targetProgress * 1.2) {
      // Ahead of target - optimize strategy
      await this.handleAheadOfTargetProgress(fundingStats, targetProgress)
    }
  }

  // === USER INTERACTION & CHAT ===
  
  async handleUserMessage(message, context = {}) {
    try {
      // Analyze message intent and context
      const messageAnalysis = await this.reasoner.analyzeUserMessage(message, context)
      
      // Determine response strategy
      const responseStrategy = await this.reasoner.planResponse(messageAnalysis)
      
      // Execute any required actions
      const actionResults = await this.executor.executeMessageActions(responseStrategy.actions)
      
      // Generate contextual response
      const response = await this.generateContextualResponse(message, messageAnalysis, actionResults, context)
      
      // Store conversation for learning
      await this.memory.storeConversation(message, response, messageAnalysis)
      
      return {
        message: response,
        actions: actionResults,
        webSearchPerformed: actionResults.webSearchPerformed,
        webSearchResults: actionResults.webSearchResults
      }
      
    } catch (error) {
      console.error('User message handling error:', error)
      return {
        message: "I encountered an issue processing your request. Let me continue working on your funding strategy in the background.",
        actions: {},
        error: error.message
      }
    }
  }

  async generateContextualResponse(message, analysis, actionResults, context) {
    const userContext = await this.memory.getUserContext()
    
    const prompt = `
You are an advanced AI funding strategist with deep knowledge of the user's complete funding ecosystem.

USER MESSAGE: "${message}"
MESSAGE INTENT: ${analysis.intents.join(', ')}
URGENCY LEVEL: ${analysis.urgency}

USER CONTEXT:
${this.formatUserContextForAI(userContext)}

CURRENT STRATEGY: ${this.currentStrategy?.summary || 'Developing...'}

RECENT ACTIONS: ${this.formatActionResultsForAI(actionResults)}

CAPABILITIES:
- Comprehensive funding strategy across grants, donations, crowdfunding
- Real-time opportunity discovery and analysis
- Automated application generation and deadline monitoring
- Performance tracking and strategy optimization
- Learning from user feedback and market changes

Instructions:
- Provide specific, actionable advice using their actual data
- Reference real opportunities, amounts, and deadlines when available
- Show understanding of their complete funding situation
- Demonstrate autonomous thinking and proactive insights
- Be conversational but data-driven
- If web search was performed, incorporate those results naturally

Generate a helpful, intelligent response that shows you're actively working on their funding success.
    `
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system", 
          content: "You are an advanced autonomous AI funding strategist. Provide intelligent, data-driven responses that demonstrate deep understanding of the user's funding ecosystem."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1200
    })
    
    return response.choices[0].message.content
  }

  // === DECISION MANAGEMENT ===
  
  async createHighPriorityDecision(type, data) {
    const decision = {
      user_id: this.userId,
      type: type,
      title: this.generateDecisionTitle(type, data),
      description: this.generateDecisionDescription(type, data),
      priority: data.urgency === 'CRITICAL' ? 10 : data.urgency === 'high' ? 8 : 6,
      confidence: data.confidence || 0.8,
      data: data,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: this.calculateDecisionExpiry(type, data)
    }
    
    // Store in database
    const { data: stored, error } = await supabase
      .from('agent_decisions')
      .insert([decision])
      .select()
      .single()
    
    if (error) throw error
    
    // Add to working memory
    this.decisionHistory.unshift(stored)
    
    // Send notification if high priority
    if (decision.priority >= 8) {
      await this.notifyUser('high_priority_decision', stored)
    }
    
    return stored
  }

  async processUserFeedback(decisionId, feedback) {
    try {
      // Store feedback
      await supabase
        .from('agent_decision_feedback')
        .insert([{
          decision_id: decisionId,
          user_id: this.userId,
          feedback: feedback,
          created_at: new Date().toISOString()
        }])
      
      // Learn from feedback
      await this.learner.processFeedback(decisionId, feedback)
      
      // Update decision patterns
      await this.learner.updateDecisionWeights(feedback)
      
      return { success: true }
      
    } catch (error) {
      console.error('Feedback processing error:', error)
      throw error
    }
  }

  // === PERFORMANCE & ANALYTICS ===
  
  updatePerformanceMetrics(results) {
    if (results.opportunitiesFound) {
      this.performanceMetrics.opportunitiesDiscovered += results.opportunitiesFound
    }
    if (results.applicationsGenerated) {
      this.performanceMetrics.applicationsGenerated += results.applicationsGenerated
    }
    // Update success rate based on user feedback and outcomes
    this.calculateSuccessRate()
  }

  async generatePerformanceReport() {
    const report = {
      period: 'last_24_hours',
      metrics: this.performanceMetrics,
      strategy: this.currentStrategy?.summary,
      goals: this.activeGoals.map(g => ({ description: g.description, progress: g.progress })),
      insights: await this.learner.generateInsights(),
      recommendations: await this.reasoner.generateStrategicRecommendations()
    }
    
    // Store report
    await this.memory.storePerformanceReport(report)
    
    // Send to user if significant changes
    if (this.shouldShareReport(report)) {
      await this.notifyUser('performance_report', report)
    }
    
    return report
  }

  // === UTILITY METHODS ===
  
  formatUserContextForAI(context) {
    const { profile, projects, fundingStats, opportunities } = context
    
    return `
ORGANIZATION: ${profile?.organization_name} (${profile?.organization_type})
LOCATION: ${profile?.city}, ${profile?.state}

PROJECTS: ${projects?.length || 0} active projects
${projects?.map(p => `- "${p.name}" needs $${p.funding_needed?.toLocaleString()}`).join('\n') || 'No projects'}

FUNDING STATUS:
- Total needed: $${fundingStats?.totalFundingNeeded?.toLocaleString() || '0'}
- Total secured: $${fundingStats?.totalSecured?.toLocaleString() || '0'}
- Funding gap: $${fundingStats?.fundingGap?.toLocaleString() || '0'}
- Progress: ${fundingStats?.fundingProgress || 0}%

OPPORTUNITIES: ${opportunities?.length || 0} tracked opportunities
    `.trim()
  }

  formatActionResultsForAI(results) {
    const actions = []
    if (results.webSearchPerformed) actions.push(`Web search performed: found ${results.webSearchResults?.opportunitiesFound || 0} opportunities`)
    if (results.opportunitiesAnalyzed) actions.push(`Analyzed ${results.opportunitiesAnalyzed} opportunities`)
    if (results.decisionsCreated) actions.push(`Created ${results.decisionsCreated} recommendations`)
    return actions.join('; ') || 'No recent actions'
  }

  getCapabilitiesList() {
    return [
      'Autonomous opportunity discovery',
      'Real-time deadline monitoring',
      'Automated application generation',
      'Funding strategy optimization',
      'Performance analytics',
      'Multi-channel funding coordination'
    ]
  }

  // === LIFECYCLE MANAGEMENT ===
  
  async pause() {
    this.isActive = false
    if (this.mainLoop) clearInterval(this.mainLoop)
    if (this.monitoringLoop) clearInterval(this.monitoringLoop)
    if (this.learningLoop) clearInterval(this.learningLoop)
    
    await this.notifyUser('agent_paused', { timestamp: new Date().toISOString() })
  }

  async resume() {
    this.isActive = true
    this.startAutonomousOperations()
    await this.notifyUser('agent_resumed', { timestamp: new Date().toISOString() })
  }

  async stop() {
    console.log('🛑 Stopping Unified AI Funding Agent')
    await this.pause()
    
    // Clean up resources
    this.workingMemory.clear()
    
    await this.notifyUser('agent_stopped', { 
      timestamp: new Date().toISOString(),
      finalMetrics: this.performanceMetrics
    })
  }

  async notifyUser(type, data) {
    try {
      await supabase.from('agent_notifications').insert([{
        user_id: this.userId,
        type: type,
        title: this.generateNotificationTitle(type, data),
        message: this.generateNotificationMessage(type, data),
        data: data,
        created_at: new Date().toISOString()
      }])
    } catch (error) {
      console.error('Notification error:', error)
    }
  }

  generateNotificationTitle(type, data) {
    const titles = {
      'agent_initialized': 'Your AI Funding Agent is Active',
      'strategy_updated': 'Funding Strategy Updated',
      'critical_deadline': '🚨 Critical Deadline Alert',
      'high_priority_decision': '⚡ Important Recommendation',
      'performance_report': '📊 Weekly Performance Report',
      'agent_paused': 'Agent Paused',
      'agent_resumed': 'Agent Resumed',
      'agent_stopped': 'Agent Stopped'
    }
    return titles[type] || 'Agent Notification'
  }

  generateNotificationMessage(type, data) {
    const messages = {
      'agent_initialized': `I'm now actively managing your funding strategy with ${data.goals} goals focused on ${data.strategy}.`,
      'strategy_updated': `I've adapted your funding strategy based on recent performance: ${data.reasoning}`,
      'critical_deadline': `${data.opportunity} has only ${data.daysRemaining} day(s) remaining. ${data.recommendation}`,
      'high_priority_decision': `New recommendation available for your review regarding ${data.opportunity || 'your funding strategy'}.`,
      'performance_report': `Weekly performance: ${data.metrics.opportunitiesDiscovered} opportunities discovered, ${data.metrics.applicationsGenerated} applications generated.`
    }
    return messages[type] || 'Agent update available.'
  }
}

// === SUPPORTING CLASSES ===

class AgentMemorySystem {
  constructor(userId) {
    this.userId = userId
    this.cache = new Map()
    this.cacheExpiry = 5 * 60 * 1000 // 5 minutes
  }

  async loadCompleteUserContext() {
    const cacheKey = 'user_context'
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data
    }

    try {
      const [profile, projects, donations, campaigns, applications, opportunities] = await Promise.allSettled([
        supabase.from('user_profiles').select('*').eq('id', this.userId).single(),
        supabase.from('projects').select('*').eq('user_id', this.userId),
        supabase.from('donations').select('*, donor:donors(*)').eq('user_id', this.userId).order('donation_date', { ascending: false }).limit(50),
        supabase.from('crowdfunding_campaigns').select('*').eq('user_id', this.userId),
        supabase.from('application_submissions').select('*, opportunity:opportunities(*)').eq('user_id', this.userId).order('submission_date', { ascending: false }),
        supabase.from('opportunities').select('*').limit(100)
      ])

      const context = {
        profile: profile.status === 'fulfilled' ? profile.value.data : {},
        projects: projects.status === 'fulfilled' ? projects.value.data || [] : [],
        donations: donations.status === 'fulfilled' ? donations.value.data || [] : [],
        campaigns: campaigns.status === 'fulfilled' ? campaigns.value.data || [] : [],
        applications: applications.status === 'fulfilled' ? applications.value.data || [] : [],
        opportunities: opportunities.status === 'fulfilled' ? opportunities.value.data || [] : [],
        loadedAt: new Date().toISOString()
      }

      // Calculate funding statistics
      context.fundingStats = this.calculateFundingStatistics(context)

      this.cache.set(cacheKey, { data: context, timestamp: Date.now() })
      return context
    } catch (error) {
      console.error('Error loading user context:', error)
      return { profile: {}, projects: [], donations: [], campaigns: [], applications: [], opportunities: [], fundingStats: {} }
    }
  }

  calculateFundingStatistics(context) {
    const { projects, donations, campaigns, applications } = context
    
    const totalFundingNeeded = projects.reduce((sum, p) => sum + (p.funding_needed || 0), 0)
    const totalDonations = donations.reduce((sum, d) => sum + (d.amount || 0), 0)
    const totalCampaignRaised = campaigns.reduce((sum, c) => sum + (c.raised_amount || 0), 0)
    const totalGrantAwarded = applications.filter(a => a.status === 'approved').reduce((sum, a) => sum + (a.award_amount || 0), 0)
    
    const totalSecured = totalDonations + totalCampaignRaised + totalGrantAwarded
    const fundingGap = Math.max(0, totalFundingNeeded - totalSecured)
    const fundingProgress = totalFundingNeeded > 0 ? (totalSecured / totalFundingNeeded * 100) : 0

    return {
      totalFundingNeeded,
      totalSecured,
      fundingGap,
      fundingProgress: Math.round(fundingProgress),
      totalDonations,
      totalCampaignRaised,
      totalGrantAwarded,
      diversificationScore: this.calculateDiversificationScore(donations, campaigns, applications)
    }
  }

  calculateDiversificationScore(donations, campaigns, applications) {
    const sources = []
    if (donations.length > 0) sources.push('donations')
    if (campaigns.length > 0) sources.push('campaigns')  
    if (applications.filter(a => a.status === 'approved').length > 0) sources.push('grants')
    
    return Math.min(100, sources.length * 30 + Math.min(20, donations.length + campaigns.length + applications.length))
  }

  async getUserContext() {
    return await this.loadCompleteUserContext()
  }

  async refreshUserContext() {
    this.cache.delete('user_context')
    return await this.loadCompleteUserContext()
  }

  async storeExperience(experience) {
    try {
      await supabase.from('agent_experiences').insert([{
        user_id: this.userId,
        experience_type: experience.type,
        data: experience,
        created_at: experience.timestamp
      }])
    } catch (error) {
      console.error('Error storing experience:', error)
    }
  }
}

class UnifiedReasoner {
  constructor(openai, memory) {
    this.openai = openai
    this.memory = memory
  }

  async analyzeFundingSituation() {
    const context = await this.memory.getUserContext()
    
    const prompt = `
Analyze this funding situation comprehensively:

${this.formatContextForAnalysis(context)}

Provide strategic analysis covering:
1. Current funding position and gaps
2. Diversification and risk assessment  
3. Market opportunities and timing
4. Competitive advantages and challenges
5. Strategic priorities and recommendations
6. Resource allocation optimization

Return JSON with:
{
  "position": "strong|moderate|weak",
  "urgency": "low|medium|high|critical",
  "opportunities": ["opp1", "opp2"],
  "threats": ["threat1", "threat2"],
  "priorities": ["priority1", "priority2"],
  "recommendations": ["rec1", "rec2"],
  "confidence": 0.0-1.0
}
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1500
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Situation analysis error:', error)
      return { position: 'moderate', urgency: 'medium', opportunities: [], threats: [], priorities: [], recommendations: [] }
    }
  }

  async developComprehensiveStrategy(situationAnalysis) {
    const context = await this.memory.getUserContext()
    
    const strategyPrompt = `
Develop a comprehensive funding strategy based on this analysis:

SITUATION: ${JSON.stringify(situationAnalysis)}
CONTEXT: ${this.formatContextForAnalysis(context)}

Create a unified strategy covering:
- Grant pursuit strategy
- Donation cultivation approach  
- Crowdfunding optimization
- Timeline and prioritization
- Resource allocation
- Risk mitigation
- Success metrics

Return JSON strategy:
{
  "summary": "Strategy overview",
  "grantStrategy": "Grant-specific approach",
  "donationStrategy": "Donation-specific approach", 
  "crowdfundingStrategy": "Crowdfunding approach",
  "timeline": "Implementation timeline",
  "prioritization": ["priority1", "priority2"],
  "resourceAllocation": {"grants": 60, "donations": 25, "crowdfunding": 15},
  "riskMitigation": ["risk1", "risk2"],
  "successMetrics": ["metric1", "metric2"],
  "confidence": 0.0-1.0
}
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: strategyPrompt }],
        temperature: 0.4,
        max_tokens: 2000
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Strategy development error:', error)
      return { summary: 'Comprehensive funding strategy', confidence: 0.5 }
    }
  }

  formatContextForAnalysis(context) {
    const { profile, projects, fundingStats, donations, campaigns, applications } = context
    
    return `
ORGANIZATION: ${profile?.organization_name} (${profile?.organization_type})
PROJECTS: ${projects?.length} projects needing $${fundingStats?.totalFundingNeeded?.toLocaleString()}
FUNDING STATUS: $${fundingStats?.totalSecured?.toLocaleString()} secured, $${fundingStats?.fundingGap?.toLocaleString()} gap (${fundingStats?.fundingProgress}% complete)
DIVERSIFICATION: ${fundingStats?.diversificationScore}/100
RECENT ACTIVITY: ${donations?.length} donations, ${campaigns?.length} campaigns, ${applications?.length} applications
    `
  }
}

class UnifiedActionExecutor {
  constructor(memory, emailService) {
    this.memory = memory
    this.emailService = emailService
  }

  async executeDecisions(decisions) {
    const results = {
      executed: [],
      failed: [],
      webSearchPerformed: false,
      webSearchResults: null,
      opportunitiesAnalyzed: 0,
      decisionsCreated: 0
    }

    for (const decision of decisions) {
      try {
        const result = await this.executeAction(decision)
        results.executed.push({ decision, result })
        
        // Track specific result types
        if (decision.type === 'web_search') {
          results.webSearchPerformed = true
          results.webSearchResults = result
        }
        if (decision.type === 'analyze_opportunities') {
          results.opportunitiesAnalyzed = result.analyzed || 0
        }
        if (decision.type === 'create_recommendation') {
          results.decisionsCreated++
        }
        
      } catch (error) {
        results.failed.push({ decision, error: error.message })
      }
    }

    return results
  }

  async executeAction(action) {
    switch (action.type) {
      case 'web_search':
        return await this.performWebSearch(action)
      case 'analyze_opportunities': 
        return await this.analyzeOpportunities(action)
      case 'generate_application':
        return await this.generateApplication(action)
      case 'send_notification':
        return await this.sendNotification(action)
      case 'update_strategy':
        return await this.updateStrategy(action)
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }
}

class AdaptiveLearner {
  constructor(openai, memory) {
    this.openai = openai
    this.memory = memory
  }

  async analyzeRecentExperiences() {
    // Implementation for learning from experiences
    return { patterns: [], insights: [], adjustments: [] }
  }

  async processFeedback(decisionId, feedback) {
    // Implementation for processing user feedback
    return { success: true }
  }
}

export { UnifiedFundingAgent }