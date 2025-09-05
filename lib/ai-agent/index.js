// True AI Funding Agent - Autonomous, Goal-Oriented, Learning System
// This is a real AI agent that makes decisions, learns, and adapts
import { supabase } from '../supabase.js'
import { MailgunEmailService } from '../email-service.js'

class AIFundingAgent {
  constructor(userId, openaiInstance, supabaseInstance) {
    this.userId = userId
    this.openai = openaiInstance
    this.supabase = supabaseInstance
    
    // Integrated email service
    this.emailService = new MailgunEmailService()
    
    // Agent Core Components
    this.memory = new AgentMemory(userId, supabase)
    this.planner = new StrategicPlanner(openai, this.memory)
    this.executor = new ActionExecutor(supabase, this.memory, this.emailService)
    this.learner = new ExperienceLearner(openai, this.memory)
    this.reasoner = new ContextualReasoner(openai, this.memory)
    
    // Agent State
    this.goals = []
    this.currentPlan = null
    this.isActive = true
    this.personality = null
    this.preferences = null
    
    // Initialize agent
    this.initialize()
  }

  async initialize() {
    console.log(`🤖 Initializing AI Funding Agent for user ${this.userId}`)
    
    // Load agent memory and context
    await this.memory.loadUserContext()
    await this.loadPersonality()
    
    // Set initial goals based on user's situation
    await this.setInitialGoals()
    
    // Start autonomous operation
    this.startAutonomousLoop()
  }

  // === CORE AGENT BEHAVIOR ===

  async think() {
    console.log('🧠 Agent is thinking...')
    
    // 1. Assess current situation
    const situation = await this.assessSituation()
    
    // 2. Reason about context and opportunities
    const reasoning = await this.reasoner.analyzeContext(situation)
    
    // 3. Update goals based on new information
    await this.updateGoals(reasoning)
    
    // 4. Plan actions to achieve goals
    const plan = await this.planner.createPlan(this.goals, situation, reasoning)
    
    // 5. Execute highest priority actions
    const results = await this.executor.executeActions(plan.priorityActions)
    
    // 6. Learn from results
    await this.learner.processExperience(plan, results, situation)
    
    // 7. Update memory with new insights
    await this.memory.storeExperience({
      situation,
      reasoning,
      plan,
      results,
      timestamp: new Date().toISOString()
    })

    return {
      reasoning: reasoning.summary,
      actions_taken: results.actionsCompleted,
      insights: results.insights,
      next_focus: plan.nextPriority
    }
  }

  async assessSituation() {
    const context = await this.memory.getCurrentContext()
    
    // Gather comprehensive situation data
    const [applications, opportunities, deadlines, progress] = await Promise.all([
      this.getApplicationStatus(),
      this.scanNewOpportunities(),
      this.checkUpcomingDeadlines(),
      this.analyzeProgress()
    ])

    return {
      timestamp: new Date().toISOString(),
      user_context: context,
      applications: applications,
      opportunities: opportunities,
      deadlines: deadlines,
      progress: progress,
      urgency_level: this.calculateUrgencyLevel(deadlines, applications),
      success_trajectory: this.calculateSuccessTrajectory(progress)
    }
  }

  async updateGoals(reasoning) {
    // AI agent autonomously updates its goals based on reasoning
    const goalUpdatePrompt = `
    As an AI funding agent, analyze the current situation and determine if goals should be updated.
    
    Current Goals: ${JSON.stringify(this.goals)}
    
    Reasoning: ${reasoning.summary}
    Key Insights: ${reasoning.insights.join(', ')}
    
    Should any goals be:
    1. Added (new opportunities or priorities)
    2. Modified (changed circumstances)
    3. Removed (completed or no longer relevant)
    4. Reprioritized (urgency changes)
    
    Respond with updated goals in JSON format:
    {
      "goals": [
        {
          "id": "goal_id",
          "type": "funding_acquisition|deadline_management|opportunity_exploration|relationship_building",
          "description": "Clear goal description",
          "priority": 1-10,
          "target_date": "2024-12-31",
          "success_criteria": "Measurable criteria",
          "status": "active|paused|completed"
        }
      ],
      "reasoning": "Why these goals were chosen"
    }
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: goalUpdatePrompt }],
        temperature: 0.3,
        max_tokens: 1500
      })

      const goalUpdate = JSON.parse(response.choices[0].message.content)
      this.goals = goalUpdate.goals
      
      // Store goal evolution in memory
      await this.memory.storeGoalEvolution(this.goals, goalUpdate.reasoning)
      
    } catch (error) {
      console.error('Error updating goals:', error)
    }
  }

  async setInitialGoals() {
    const context = await this.memory.getCurrentContext()
    
    const goalPrompt = `
    As an AI funding agent for a user, analyze their profile and set initial goals.
    
    User Profile: ${JSON.stringify(context.profile)}
    Projects: ${JSON.stringify(context.projects)}
    Current Applications: ${JSON.stringify(context.applications)}
    
    Based on this information, what should be my primary goals as their AI funding agent?
    Consider:
    - Funding needs and gaps
    - Application deadlines and priorities  
    - Opportunity discovery
    - Relationship building
    - Strategic positioning
    
    Respond with 3-5 specific, measurable goals in JSON format:
    {
      "goals": [
        {
          "id": "secure_primary_funding",
          "type": "funding_acquisition",
          "description": "Secure $500k funding for community center project",
          "priority": 10,
          "target_date": "2024-06-30",
          "success_criteria": "Application approved and funding awarded",
          "status": "active"
        }
      ],
      "reasoning": "Why these goals are appropriate for this user"
    }
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: goalPrompt }],
        temperature: 0.4,
        max_tokens: 1500
      })

      const initialGoals = JSON.parse(response.choices[0].message.content)
      this.goals = initialGoals.goals
      
      console.log(`🎯 Agent set ${this.goals.length} initial goals:`, this.goals.map(g => g.description))
      
    } catch (error) {
      console.error('Error setting initial goals:', error)
      // Fallback to basic goals
      this.goals = this.getDefaultGoals()
    }
  }

  // === AUTONOMOUS OPERATION ===

  startAutonomousLoop() {
    console.log('🚀 Starting autonomous agent operation')
    
    // Primary thinking loop - every 30 minutes
    this.thinkingInterval = setInterval(() => {
      this.think().catch(console.error)
    }, 30 * 60 * 1000)
    
    // Opportunity scanning - every 15 minutes  
    this.scanningInterval = setInterval(() => {
      this.scanAndEvaluateOpportunities().catch(console.error)
    }, 15 * 60 * 1000)
    
    // Deadline monitoring - every 5 minutes
    this.deadlineInterval = setInterval(() => {
      this.monitorDeadlines().catch(console.error)
    }, 5 * 60 * 1000)
    
    // Learning and adaptation - daily
    this.learningInterval = setInterval(() => {
      this.performDailyLearning().catch(console.error)
    }, 24 * 60 * 60 * 1000)
  }

  async scanAndEvaluateOpportunities() {
    console.log('🔍 Agent scanning for new opportunities...')
    
    const newOpportunities = await this.getNewOpportunities()
    
    for (const opportunity of newOpportunities) {
      const evaluation = await this.evaluateOpportunity(opportunity)
      
      if (evaluation.shouldPursue) {
        await this.planOpportunityPursuit(opportunity, evaluation)
        
        // Send opportunity match email
        await this.sendOpportunityMatchEmail(this.userId, {
          opportunity,
          evaluation,
          agentRecommendation: evaluation.recommendedApproach
        })
      }
      
      // Learn from evaluation
      await this.memory.storeOpportunityEvaluation(opportunity, evaluation)
    }
  }

  async evaluateOpportunity(opportunity) {
    const context = await this.memory.getCurrentContext()
    
    const evaluationPrompt = `
    As an AI funding agent, evaluate this opportunity for my user:
    
    Opportunity: ${JSON.stringify(opportunity)}
    User Projects: ${JSON.stringify(context.projects)}
    Current Goals: ${JSON.stringify(this.goals)}
    Past Success Patterns: ${JSON.stringify(this.memory.getSuccessPatterns())}
    
    Evaluate based on:
    1. Strategic fit with user's goals
    2. Probability of success
    3. Resource requirements
    4. Timing considerations
    5. Competitive landscape
    6. Long-term value
    
    Respond in JSON:
    {
      "shouldPursue": true/false,
      "confidence": 0.0-1.0,
      "fitScore": 0-100,
      "reasoning": "Detailed reasoning",
      "risks": ["risk1", "risk2"],
      "advantages": ["advantage1", "advantage2"],
      "recommendedApproach": "How to pursue this opportunity",
      "resourcesNeeded": ["resource1", "resource2"],
      "timeline": "Suggested timeline"
    }
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: evaluationPrompt }],
        temperature: 0.3,
        max_tokens: 1500
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Error evaluating opportunity:', error)
      return { shouldPursue: false, confidence: 0, reasoning: 'Evaluation failed' }
    }
  }

  async planOpportunityPursuit(opportunity, evaluation) {
    // Agent autonomously creates pursuit plan
    const plan = await this.planner.createOpportunityPlan(opportunity, evaluation)
    
    // Add to goals if significant opportunity
    if (evaluation.fitScore > 75) {
      const newGoal = {
        id: `pursue_${opportunity.id}`,
        type: 'funding_acquisition',
        description: `Secure funding from ${opportunity.title}`,
        priority: Math.ceil(evaluation.fitScore / 10),
        target_date: opportunity.deadline_date,
        success_criteria: 'Application submitted and approved',
        status: 'active',
        metadata: { opportunityId: opportunity.id, plan }
      }
      
      this.goals.push(newGoal)
      
      // Notify user of agent's decision
      await this.notifyUserOfAgentDecision('opportunity_pursuit', {
        opportunity,
        evaluation,
        plan,
        reasoning: `I've decided to pursue this opportunity because: ${evaluation.reasoning}`
      })
    }
  }

  async monitorDeadlines() {
    console.log('⏰ Agent monitoring deadlines...')
    
    const upcomingDeadlines = await this.getUpcomingDeadlines()
    
    for (const deadline of upcomingDeadlines) {
      const readiness = await this.assessDeadlineReadiness(deadline)
      
      if (readiness.risk === 'high') {
        await this.takeEmergencyAction(deadline, readiness)
      } else if (readiness.risk === 'medium') {
        await this.acceleratePreparation(deadline, readiness)
      }
    }
  }

  async takeEmergencyAction(deadline, readiness) {
    console.log('🚨 Agent taking emergency action for deadline:', deadline.title)
    
    // Agent autonomously decides on emergency measures
    const emergencyPlan = await this.planner.createEmergencyPlan(deadline, readiness)
    
    // Execute immediate actions
    await this.executor.executeEmergencyActions(emergencyPlan)
    
    // Notify user with urgency
    await this.notifyUserOfAgentDecision('emergency_action', {
      deadline,
      readiness,
      plan: emergencyPlan,
      urgency: 'critical'
    })
  }

  // === LEARNING AND ADAPTATION ===

  async performDailyLearning() {
    console.log('📚 Agent performing daily learning...')
    
    const todaysExperiences = await this.memory.getTodaysExperiences()
    const insights = await this.learner.analyzeExperiences(todaysExperiences)
    
    // Update agent behavior based on learnings
    await this.adaptBehavior(insights)
    
    // Update success patterns
    await this.memory.updateSuccessPatterns(insights.patterns)
    
    // Refine goals based on learnings
    await this.refineGoals(insights.goalInsights)
  }

  async adaptBehavior(insights) {
    // Agent learns and adapts its decision-making
    if (insights.opportunityPatterns) {
      this.reasoner.updateOpportunityWeights(insights.opportunityPatterns)
    }
    
    if (insights.timingPatterns) {
      this.planner.updateTimingPreferences(insights.timingPatterns)
    }
    
    if (insights.successFactors) {
      this.executor.updateActionPriorities(insights.successFactors)
    }
  }

  // === USER INTERACTION ===

  async notifyUserOfAgentDecision(decisionType, data) {
    const notification = {
      user_id: this.userId,
      type: 'agent_decision',
      decision_type: decisionType,
      title: this.getDecisionTitle(decisionType, data),
      message: this.getDecisionMessage(decisionType, data),
      data: data,
      requires_approval: this.requiresApproval(decisionType),
      created_at: new Date().toISOString()
    }
    
    await this.supabase.from('agent_notifications').insert([notification])
    
    // Send email if high priority
    if (data.urgency === 'critical' || data.priority > 8) {
      await this.sendAgentDecisionEmail(this.userId, notification)
    }
  }

  async handleUserFeedback(notificationId, feedback) {
    // Agent learns from user feedback on its decisions
    const notification = await this.memory.getNotification(notificationId)
    
    await this.learner.processFeedback(notification, feedback)
    
    // Adjust future decision-making based on feedback
    if (feedback.approved === false) {
      await this.learner.adjustDecisionWeights(notification.decision_type, 'negative')
    } else if (feedback.rating >= 4) {
      await this.learner.adjustDecisionWeights(notification.decision_type, 'positive')
    }
  }

  // === EMAIL INTEGRATION ===

  async sendOpportunityMatchEmail(userId, opportunityMatch) {
    try {
      await this.emailService.sendOpportunityMatchEmail(userId, opportunityMatch)
      console.log(`📧 Sent opportunity match email for user ${userId}`)
    } catch (error) {
      console.error('Error sending opportunity match email:', error)
    }
  }

  async sendAgentDecisionEmail(userId, decision) {
    try {
      await this.emailService.sendAgentDecisionEmail(userId, decision)
      console.log(`📧 Sent agent decision email for user ${userId}`)
    } catch (error) {
      console.error('Error sending agent decision email:', error)
    }
  }

  // === CONVERSATION INTERFACE ===

  async chat(userMessage) {
    // Natural language interface with the agent
    const context = await this.memory.getCurrentContext()
    const recentExperiences = await this.memory.getRecentExperiences(7) // Last 7 days
    
    const chatPrompt = `
    You are an AI funding agent for a user. Respond naturally and helpfully.
    
    Current Goals: ${JSON.stringify(this.goals)}
    Recent Actions: ${JSON.stringify(recentExperiences.slice(0, 3))}
    User Context: ${JSON.stringify(context.summary)}
    
    User says: "${userMessage}"
    
    Respond as their personal AI funding agent. Be conversational, helpful, and show your autonomous thinking.
    If relevant, mention:
    - What you've been working on
    - Opportunities you've discovered
    - Recommendations based on your analysis
    - Questions to help you serve them better
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: chatPrompt }],
        temperature: 0.7,
        max_tokens: 800
      })

      const agentResponse = response.choices[0].message.content
      
      // Store conversation in memory
      await this.memory.storeConversation(userMessage, agentResponse)
      
      return agentResponse
    } catch (error) {
      console.error('Error in agent chat:', error)
      return "I apologize, but I'm having trouble processing your message right now. Let me continue working on your funding goals in the background."
    }
  }

  // === UTILITY METHODS ===

  getDecisionTitle(decisionType, data) {
    const titles = {
      'opportunity_pursuit': `I'm pursuing: ${data.opportunity.title}`,
      'emergency_action': `Urgent action taken: ${data.deadline.title}`,
      'goal_update': `I've updated your funding goals`,
      'strategy_change': `Strategy adjustment recommended`
    }
    return titles[decisionType] || 'Agent Decision'
  }

  getDecisionMessage(decisionType, data) {
    const messages = {
      'opportunity_pursuit': `I've identified a high-value funding opportunity that matches your goals. ${data.reasoning}`,
      'emergency_action': `Critical deadline approaching - I've taken immediate action to ensure you don't miss this opportunity.`,
      'goal_update': `Based on recent developments, I've updated your funding strategy to optimize for current conditions.`,
      'strategy_change': `Market conditions suggest a strategic adjustment to improve your funding success rate.`
    }
    return messages[decisionType] || 'Your AI agent has made an important decision.'
  }

  requiresApproval(decisionType) {
    // Some decisions require user approval
    return ['major_strategy_change', 'large_investment'].includes(decisionType)
  }

  async getNewOpportunities() {
    const lastCheck = await this.memory.getLastOpportunityCheck()
    
    const { data } = await this.supabase
      .from('opportunities')
      .select('*')
      .gt('created_at', lastCheck)
      .order('created_at', { ascending: false })
    
    return data || []
  }

  async getApplicationStatus() {
    const { data } = await this.supabase
      .from('application_submissions')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false })
    
    return data || []
  }

  async checkUpcomingDeadlines() {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    
    const { data } = await this.supabase
      .from('opportunities')
      .select('*')
      .lte('deadline_date', thirtyDaysFromNow.toISOString())
      .gte('deadline_date', new Date().toISOString())
      .order('deadline_date', { ascending: true })
    
    return data || []
  }

  async analyzeProgress() {
    const [applications, goals] = await Promise.all([
      this.getApplicationStatus(),
      this.goals
    ])
    
    return {
      total_applications: applications.length,
      active_applications: applications.filter(a => a.status === 'submitted').length,
      success_rate: this.calculateSuccessRate(applications),
      goals_progress: this.calculateGoalsProgress(goals),
      funding_secured: applications.filter(a => a.status === 'awarded').reduce((sum, a) => sum + (a.amount_requested || 0), 0)
    }
  }

  calculateUrgencyLevel(deadlines, applications) {
    const criticalDeadlines = deadlines.filter(d => {
      const deadline = new Date(d.deadline_date)
      const now = new Date()
      const daysRemaining = (deadline - now) / (1000 * 60 * 60 * 24)
      return daysRemaining <= 3
    })
    
    const incompleteApps = applications.filter(a => (a.completion_percentage || 0) < 80)
    
    if (criticalDeadlines.length > 0 && incompleteApps.length > 0) return 'critical'
    if (criticalDeadlines.length > 0 || incompleteApps.length > 2) return 'high'
    return 'normal'
  }

  calculateSuccessTrajectory(progress) {
    const trend = progress.success_rate >= 0.3 ? 'positive' : 
                 progress.success_rate >= 0.15 ? 'stable' : 'needs_improvement'
    
    return {
      trend,
      confidence: Math.min(0.9, progress.total_applications * 0.1),
      projected_success: progress.success_rate * 1.2 // Slight optimistic projection
    }
  }

  calculateSuccessRate(applications) {
    if (applications.length === 0) return 0
    const successful = applications.filter(a => a.status === 'awarded').length
    return successful / applications.length
  }

  calculateGoalsProgress(goals) {
    if (goals.length === 0) return 0
    const completedGoals = goals.filter(g => g.status === 'completed').length
    return completedGoals / goals.length
  }

  getDefaultGoals() {
    return [
      {
        id: 'discover_opportunities',
        type: 'opportunity_exploration',
        description: 'Continuously discover and evaluate new funding opportunities',
        priority: 8,
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        success_criteria: 'Identify at least 5 relevant opportunities per week',
        status: 'active'
      },
      {
        id: 'monitor_deadlines',
        type: 'deadline_management',
        description: 'Track and manage application deadlines',
        priority: 9,
        target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        success_criteria: 'No missed deadlines',
        status: 'active'
      }
    ]
  }

  async loadPersonality() {
    // Load or create agent personality based on user preferences
    const { data } = await this.supabase
      .from('agent_personalities')
      .select('*')
      .eq('user_id', this.userId)
      .single()
    
    if (data) {
      this.personality = data.personality_traits
      this.preferences = data.preferences
    } else {
      // Create default personality
      this.personality = {
        proactivity: 0.8,
        risk_tolerance: 0.6,
        communication_frequency: 'moderate',
        decision_autonomy: 0.7
      }
    }
  }

  stop() {
    console.log('🛑 Stopping AI Funding Agent')
    clearInterval(this.thinkingInterval)
    clearInterval(this.scanningInterval)
    clearInterval(this.deadlineInterval)
    clearInterval(this.learningInterval)
    this.isActive = false
  }
}

// === AGENT MEMORY SYSTEM ===

class AgentMemory {
  constructor(userId, supabase) {
    this.userId = userId
    this.supabase = supabase
    this.shortTermMemory = new Map() // Recent interactions
    this.longTermMemory = new Map()  // Learned patterns
    this.workingMemory = {}          // Current context
  }

  async loadUserContext() {
    const [profile, projects, applications, opportunities] = await Promise.all([
      this.supabase.from('user_profiles').select('*').eq('id', this.userId).single(),
      this.supabase.from('projects').select('*').eq('user_id', this.userId),
      this.supabase.from('application_submissions').select('*').eq('user_id', this.userId),
      this.supabase.from('opportunity_matches').select('*, opportunities(*)').eq('user_id', this.userId)
    ])

    this.workingMemory = {
      profile: profile.data,
      projects: projects.data || [],
      applications: applications.data || [],
      opportunities: opportunities.data || [],
      loadedAt: new Date().toISOString()
    }
  }

  async storeExperience(experience) {
    // Store in database for persistence
    await this.supabase.from('agent_experiences').insert([{
      user_id: this.userId,
      experience_type: 'thinking_cycle',
      data: experience,
      created_at: experience.timestamp
    }])

    // Store in short-term memory
    this.shortTermMemory.set(experience.timestamp, experience)
    
    // Cleanup old short-term memories (keep last 100)
    if (this.shortTermMemory.size > 100) {
      const oldestKey = Array.from(this.shortTermMemory.keys())[0]
      this.shortTermMemory.delete(oldestKey)
    }
  }

  async getSuccessPatterns() {
    // Retrieve learned success patterns
    const { data } = await this.supabase
      .from('agent_learning_patterns')
      .select('*')
      .eq('user_id', this.userId)
      .eq('pattern_type', 'success')
    
    return data || []
  }

  async storeGoalEvolution(goals, reasoning) {
    await this.supabase.from('agent_goal_history').insert([{
      user_id: this.userId,
      goals: goals,
      reasoning: reasoning,
      created_at: new Date().toISOString()
    }])
  }

  async storeOpportunityEvaluation(opportunity, evaluation) {
    await this.supabase.from('agent_opportunity_evaluations').insert([{
      user_id: this.userId,
      opportunity_id: opportunity.id,
      evaluation: evaluation,
      created_at: new Date().toISOString()
    }])
  }

  async storeConversation(userMessage, agentResponse) {
    await this.supabase.from('agent_conversations').insert([{
      user_id: this.userId,
      user_message: userMessage,
      agent_response: agentResponse,
      created_at: new Date().toISOString()
    }])
  }

  async getLastOpportunityCheck() {
    const { data } = await this.supabase
      .from('agent_activity_log')
      .select('last_opportunity_check')
      .eq('user_id', this.userId)
      .single()
    
    return data?.last_opportunity_check || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }

  async getNotification(notificationId) {
    const { data } = await this.supabase
      .from('agent_notifications')
      .select('*')
      .eq('id', notificationId)
      .single()
    
    return data
  }

  async getTodaysExperiences() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data } = await this.supabase
      .from('agent_experiences')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', today.toISOString())
    
    return data || []
  }

  async updateSuccessPatterns(patterns) {
    await this.supabase.from('agent_learning_patterns').upsert([{
      user_id: this.userId,
      pattern_type: 'success',
      patterns: patterns,
      updated_at: new Date().toISOString()
    }])
  }

  getCurrentContext() {
    return this.workingMemory
  }

  async getRecentExperiences(days = 7) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    
    const { data } = await this.supabase
      .from('agent_experiences')
      .select('*')
      .eq('user_id', this.userId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
    
    return data || []
  }
}

// === STRATEGIC PLANNER ===

class StrategicPlanner {
  constructor(openai, memory) {
    this.openai = openai
    this.memory = memory
  }

  async createPlan(goals, situation, reasoning) {
    const planningPrompt = `
    As an AI planning system, create a strategic action plan.
    
    Goals: ${JSON.stringify(goals)}
    Current Situation: ${JSON.stringify(situation.summary || situation)}
    Reasoning: ${reasoning.summary}
    
    Create a plan with:
    1. Immediate actions (next 24 hours)
    2. Short-term actions (next week)
    3. Medium-term actions (next month)
    4. Resource allocation
    5. Risk mitigation
    6. Success metrics
    
    Respond in JSON:
    {
      "priorityActions": [
        {
          "id": "action_id",
          "type": "email|analysis|document_review|user_notification",
          "description": "Action description",
          "urgency": 1-10,
          "estimatedTime": "30 minutes",
          "dependencies": [],
          "expectedOutcome": "What this achieves"
        }
      ],
      "timeline": {
        "immediate": ["action1", "action2"],
        "shortTerm": ["action3", "action4"],
        "mediumTerm": ["action5", "action6"]
      },
      "nextPriority": "What to focus on next",
      "successMetrics": ["metric1", "metric2"]
    }
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: planningPrompt }],
        temperature: 0.3,
        max_tokens: 1500
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Error creating plan:', error)
      return { priorityActions: [], timeline: {}, nextPriority: 'Continue monitoring' }
    }
  }

  async createOpportunityPlan(opportunity, evaluation) {
    return {
      approach: evaluation.recommendedApproach,
      timeline: evaluation.timeline,
      resources: evaluation.resourcesNeeded,
      milestones: [
        'Initial research and preparation',
        'Draft application materials',
        'Review and refinement',
        'Submission'
      ]
    }
  }

  async createEmergencyPlan(deadline, readiness) {
    // Create urgent action plan for approaching deadlines
    return {
      actions: [
        { type: 'user_notification', urgency: 10, description: 'Alert user of critical deadline' },
        { type: 'document_review', urgency: 9, description: 'Review application completeness' },
        { type: 'auto_completion', urgency: 8, description: 'Auto-fill missing information where possible' }
      ],
      timeline: 'Execute immediately',
      fallbackPlan: 'Request deadline extension if possible'
    }
  }
}

// === ACTION EXECUTOR ===

class ActionExecutor {
  constructor(supabase, memory, emailService) {
    this.supabase = supabase
    this.memory = memory
    this.emailService = emailService
  }

  async executeActions(actions) {
    const results = {
      actionsCompleted: [],
      actionsFailed: [],
      insights: []
    }

    for (const action of actions) {
      try {
        const result = await this.executeAction(action)
        results.actionsCompleted.push({ action, result })
        
        if (result.insights) {
          results.insights.push(...result.insights)
        }
      } catch (error) {
        results.actionsFailed.push({ action, error: error.message })
      }
    }

    return results
  }

  async executeAction(action) {
    switch (action.type) {
      case 'email':
        return await this.sendEmail(action)
      case 'analysis':
        return await this.performAnalysis(action)
      case 'user_notification':
        return await this.notifyUser(action)
      case 'document_review':
        return await this.reviewDocuments(action)
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }

  async executeEmergencyActions(emergencyPlan) {
    const results = []
    
    for (const action of emergencyPlan.actions) {
      try {
        const result = await this.executeAction(action)
        results.push({ action, result, status: 'completed' })
      } catch (error) {
        results.push({ action, error: error.message, status: 'failed' })
      }
    }
    
    return results
  }

  async sendEmail(action) {
    // Execute email sending action through Mailgun service
    try {
      await this.emailService.sendEmail({
        to: action.recipient,
        subject: action.subject,
        template: action.template || 'agent_communication',
        data: action.data
      })
      
      // Log email activity
      await this.supabase.from('agent_email_log').insert([{
        user_id: this.memory.userId,
        action_type: 'email_sent',
        recipient: action.recipient,
        subject: action.subject,
        created_at: new Date().toISOString()
      }])

      return { success: true, insights: ['Email communication initiated'] }
    } catch (error) {
      console.error('Error sending email:', error)
      throw error
    }
  }

  async performAnalysis(action) {
    // Execute analysis action
    const analysisResult = await this.runAnalysis(action.analysisType, action.parameters)
    
    await this.supabase.from('agent_analyses').insert([{
      user_id: this.memory.userId,
      analysis_type: action.analysisType,
      parameters: action.parameters,
      results: analysisResult,
      created_at: new Date().toISOString()
    }])

    return { 
      success: true, 
      data: analysisResult,
      insights: analysisResult.insights || []
    }
  }

  async notifyUser(action) {
    // Create user notification
    await this.supabase.from('agent_notifications').insert([{
      user_id: this.memory.userId,
      type: 'agent_action',
      title: action.title || action.description,
      message: action.description,
      urgency: action.urgency,
      created_at: new Date().toISOString()
    }])

    return { success: true, insights: ['User notification created'] }
  }

  async reviewDocuments(action) {
    // Review and analyze documents
    const review = {
      documents_reviewed: action.documents || [],
      completeness_score: Math.random() * 100, // Placeholder
      missing_items: [],
      recommendations: []
    }

    await this.supabase.from('agent_document_reviews').insert([{
      user_id: this.memory.userId,
      review_data: review,
      created_at: new Date().toISOString()
    }])

    return { 
      success: true, 
      data: review,
      insights: ['Document review completed'] 
    }
  }

  async runAnalysis(analysisType, parameters) {
    // Placeholder for various analysis types
    return {
      type: analysisType,
      parameters,
      results: 'Analysis completed',
      insights: [`${analysisType} analysis provided valuable insights`],
      confidence: 0.8
    }
  }
}

// === EXPERIENCE LEARNER ===

class ExperienceLearner {
  constructor(openai, memory) {
    this.openai = openai
    this.memory = memory
  }

  async processExperience(plan, results, situation) {
    // Learn from the outcome of actions
    const learningPrompt = `
    Analyze this experience and extract learnings:
    
    Plan: ${JSON.stringify(plan)}
    Results: ${JSON.stringify(results)}
    Situation: ${JSON.stringify(situation.summary || situation)}
    
    What can be learned from this experience?
    - What worked well?
    - What could be improved?
    - What patterns emerge?
    - How should future decisions be adjusted?
    
    Respond in JSON:
    {
      "learnings": ["learning1", "learning2"],
      "patterns": {"pattern_type": "description"},
      "adjustments": ["adjustment1", "adjustment2"],
      "confidence": 0.0-1.0
    }
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: learningPrompt }],
        temperature: 0.4,
        max_tokens: 1000
      })

      const learning = JSON.parse(response.choices[0].message.content)
      
      // Store learning in memory
      await this.memory.supabase.from('agent_learnings').insert([{
        user_id: this.memory.userId,
        experience_data: { plan, results, situation },
        learnings: learning,
        created_at: new Date().toISOString()
      }])

      return learning
    } catch (error) {
      console.error('Error processing experience:', error)
      return { learnings: [], patterns: {}, adjustments: [] }
    }
  }

  async analyzeExperiences(experiences) {
    if (experiences.length === 0) {
      return { patterns: {}, goalInsights: [] }
    }

    const analysisPrompt = `
    Analyze these daily experiences and identify patterns:
    
    Experiences: ${JSON.stringify(experiences)}
    
    Identify:
    1. Success patterns
    2. Failure patterns  
    3. Timing patterns
    4. Goal effectiveness
    5. Strategy adjustments needed
    
    Respond in JSON:
    {
      "patterns": {
        "opportunityPatterns": {},
        "timingPatterns": {},
        "successFactors": {}
      },
      "goalInsights": ["insight1", "insight2"],
      "strategicAdjustments": ["adjustment1", "adjustment2"]
    }
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 1200
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Error analyzing experiences:', error)
      return { patterns: {}, goalInsights: [] }
    }
  }

  async processFeedback(notification, feedback) {
    // Learn from user feedback on agent decisions
    const pattern = {
      decision_type: notification.decision_type,
      user_response: feedback,
      context: notification.data,
      timestamp: new Date().toISOString()
    }

    await this.memory.supabase.from('agent_feedback_patterns').insert([{
      user_id: this.memory.userId,
      pattern: pattern
    }])
  }

  async adjustDecisionWeights(decisionType, feedback) {
    // Adjust decision-making based on feedback
    await this.memory.supabase.from('agent_decision_weights').upsert([{
      user_id: this.memory.userId,
      decision_type: decisionType,
      feedback_type: feedback,
      adjustment: feedback === 'positive' ? 0.1 : -0.1,
      updated_at: new Date().toISOString()
    }])
  }
}

// === CONTEXTUAL REASONER ===

class ContextualReasoner {
  constructor(openai, memory) {
    this.openai = openai
    this.memory = memory
  }

  async analyzeContext(situation) {
    const reasoningPrompt = `
    As an AI reasoning system, analyze this funding situation:
    
    Situation: ${JSON.stringify(situation)}
    
    Provide deep analysis considering:
    1. Immediate priorities and urgencies
    2. Strategic opportunities and threats
    3. Resource constraints and capabilities
    4. Market conditions and timing
    5. Risk factors and mitigation strategies
    6. Long-term implications
    
    Respond in JSON:
    {
      "summary": "Overall situation assessment",
      "priorities": ["priority1", "priority2"],
      "opportunities": ["opp1", "opp2"],
      "threats": ["threat1", "threat2"],
      "insights": ["insight1", "insight2"],
      "recommendations": ["rec1", "rec2"],
      "confidence": 0.0-1.0
    }
    `

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: reasoningPrompt }],
        temperature: 0.3,
        max_tokens: 1500
      })

      return JSON.parse(response.choices[0].message.content)
    } catch (error) {
      console.error('Error in contextual reasoning:', error)
      return {
        summary: 'Analysis unavailable',
        priorities: [],
        opportunities: [],
        threats: [],
        insights: [],
        recommendations: []
      }
    }
  }

  updateOpportunityWeights(patterns) {
    // Update opportunity evaluation weights based on learned patterns
    console.log('Updating opportunity weights based on patterns:', patterns)
  }
}

export { AIFundingAgent }