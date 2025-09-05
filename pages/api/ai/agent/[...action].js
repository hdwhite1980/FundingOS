// pages/api/ai/agent/[...action].js
// Production-optimized AI agent with comprehensive opportunity analysis

import { supabase } from '../../../../lib/supabase'

export default async function handler(req, res) {
  const { action } = req.query
  const { userId } = req.body || req.query

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' })
  }

  try {
    switch (action[0]) {
      case 'initialize':
        try {
          await initializeAgentInDatabase(userId)
          
          res.json({ 
            success: true, 
            agentId: userId,
            status: 'active',
            message: 'AI agent initialized'
          })
        } catch (error) {
          console.error('Error initializing agent:', error)
          res.status(500).json({ error: 'Failed to initialize agent' })
        }
        break

      case 'chat':
        try {
          const { message, projects, opportunities } = req.body
          if (!message) {
            return res.status(400).json({ error: 'Message is required' })
          }

          // Get user context from database
          const userContext = await getUserContext(userId)
          
          // Analyze message intent
          const messageIntent = analyzeMessageIntent(message)
          
          // Handle specific intents
          if (messageIntent.includes('analyze_opportunities') && opportunities?.length > 0) {
            // Trigger comprehensive opportunity analysis
            const analysis = await analyzeAllOpportunities(userId, projects, opportunities, userContext.profile)
            
            // Create decisions for top opportunities
            await createOpportunityDecisions(userId, analysis.topMatches)
            
            // Generate response with analysis
            const response = await generateOpportunityAnalysisResponse(analysis, projects)
            
            // Store conversation with analysis context
            await supabase.from('agent_conversations').insert([{
              user_id: userId,
              user_message: message,
              agent_response: response,
              context_type: 'opportunity_analysis',
              context_data: { analysis_summary: analysis.summary },
              created_at: new Date().toISOString()
            }])
            
            res.json({ message: response })
            return
          }
          
          // Generate regular chat response
          const response = await generateAgentResponse(message, {
            userId,
            userContext,
            projects: projects || [],
            opportunities: opportunities || []
          })
          
          // Store conversation in database
          await supabase.from('agent_conversations').insert([{
            user_id: userId,
            user_message: message,
            agent_response: response,
            created_at: new Date().toISOString()
          }])
          
          res.json({ message: response })
        } catch (error) {
          console.error('Chat error:', error)
          
          // Return appropriate error based on error type
          if (error.message.includes('rate limit')) {
            res.status(429).json({ error: error.message })
          } else if (error.message.includes('Message too long') || error.message.includes('Invalid message')) {
            res.status(400).json({ error: error.message })
          } else {
            res.status(500).json({ error: 'Chat service unavailable' })
          }
        }
        break

      case 'goals':
        try {
          const { data: goals, error } = await supabase
            .from('agent_goals')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('priority', { ascending: false })

          if (error) throw error
          
          if (!goals || goals.length === 0) {
            const initialGoals = await createInitialGoals(userId, supabase)
            res.json(initialGoals)
          } else {
            res.json(goals)
          }
        } catch (error) {
          console.error('Goals error:', error)
          res.status(500).json({ error: 'Failed to load goals' })
        }
        break

      case 'decisions':
        try {
          const limit = parseInt(req.query.limit) || 10
          
          const { data: decisions, error } = await supabase
            .from('agent_decisions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

          if (error) throw error
          res.json(decisions || [])
        } catch (error) {
          console.error('Decisions error:', error)
          res.status(500).json({ error: 'Failed to load decisions' })
        }
        break

      case 'thoughts':
        try {
          const { data: experience, error } = await supabase
            .from('agent_experiences')
            .select('*')
            .eq('user_id', userId)
            .eq('experience_type', 'thinking_cycle')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (error && error.code !== 'PGRST116') throw error
          
          res.json(experience?.data || null)
        } catch (error) {
          console.error('Thoughts error:', error)
          res.json(null)
        }
        break

      case 'toggle':
        try {
          const { status } = req.body
          
          await supabase
            .from('agent_activity_log')
            .insert([{
              user_id: userId,
              activity_type: 'status_changed',
              data: { new_status: status, timestamp: new Date().toISOString() }
            }])
          
          res.json({ success: true, status })
        } catch (error) {
          console.error('Toggle error:', error)
          res.status(500).json({ error: 'Failed to toggle agent status' })
        }
        break

      case 'decision-feedback':
        try {
          const { decisionId, feedback } = req.body
          
          const { error } = await supabase
            .from('agent_decision_feedback')
            .insert([{
              decision_id: decisionId,
              user_id: userId,
              feedback: feedback,
              created_at: new Date().toISOString()
            }])
          
          if (error) throw error
          
          res.json({ success: true })
        } catch (error) {
          console.error('Feedback error:', error)
          res.status(500).json({ error: 'Failed to process feedback' })
        }
        break

      case 'status':
        try {
          const { data: lastActivity, error } = await supabase
            .from('agent_activity_log')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (error && error.code !== 'PGRST116') {
            throw error
          }
          
          res.json({
            exists: !!lastActivity,
            status: lastActivity ? (lastActivity.data?.new_status || 'active') : 'not_initialized',
            lastActivity: lastActivity?.created_at,
            message: lastActivity ? 'Agent active' : 'Agent not initialized'
          })
        } catch (error) {
          console.error('Status check error:', error)
          res.json({
            exists: false,
            status: 'unknown',
            message: 'Status unavailable'
          })
        }
        break

      default:
        res.status(404).json({ error: 'Action not found' })
    }
  } catch (error) {
    console.error('Agent API error:', error)
    res.status(500).json({ error: error.message })
  }
}

// Core AI Response Function
async function generateAgentResponse(message, context) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI service not configured')
  }
  
  // Get project and opportunity context for better responses
  const projectContext = context.projects.length > 0 ? 
    `Active Projects: ${context.projects.map(p => `"${p.name}" (${p.project_type}, $${p.funding_needed?.toLocaleString()} needed)`).join(', ')}` : 
    'No active projects'
  
  const opportunityContext = context.opportunities.length > 0 ? 
    `Available Opportunities: ${context.opportunities.length} funding opportunities found, including: ${context.opportunities.slice(0, 3).map(o => `"${o.title}" from ${o.sponsor}`).join(', ')}${context.opportunities.length > 3 ? ` and ${context.opportunities.length - 3} more` : ''}` : 
    'No opportunities currently tracked'

  const prompt = `You are an AI funding agent helping users find and manage funding opportunities. 

User message: "${message}"

User context:
- Organization: ${context.userContext.profile?.organization_name || 'Not specified'}
- Type: ${context.userContext.profile?.organization_type || 'Not specified'}
- Location: ${context.userContext.profile?.city && context.userContext.profile?.state ? `${context.userContext.profile.city}, ${context.userContext.profile.state}` : 'Not specified'}
- ${projectContext}
- ${opportunityContext}

Your capabilities include:
1. **Opportunity Discovery**: Search and analyze funding opportunities
2. **Strategic Advice**: Provide guidance on grant applications and strategy
3. **Deadline Tracking**: Monitor application deadlines and requirements
4. **Opportunity Analysis**: Evaluate which opportunities best match user projects
5. **Application Guidance**: Help structure and improve grant applications

If asked about opportunities, analyze them against the user's projects and provide specific recommendations about which ones to pursue and why.

Respond in a helpful, conversational way with clear formatting. Use line breaks and bullet points where appropriate for readability. Keep responses focused and actionable.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI funding agent. Provide well-formatted, conversational responses with proper line breaks and structure. Use bullet points and clear sections when helpful. Be specific and actionable in your advice.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    
    const data = await response.json()
    let agentResponse = data.choices[0].message.content

    // Clean up formatting for better display
    agentResponse = agentResponse
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
      .replace(/\n{3,}/g, '\n\n') // Limit excessive line breaks
      .trim()

    return agentResponse
  } catch (error) {
    console.error('AI response error:', error)
    return "I'm having trouble processing your request right now. Let me continue monitoring your funding opportunities in the background. Please try again in a moment."
  }
}

// Message Intent Analysis
function analyzeMessageIntent(message) {
  const intents = []
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('analyz') || lowerMessage.includes('recommend') || lowerMessage.includes('should i apply')) {
    intents.push('analyze_opportunities')
  }
  if (lowerMessage.includes('deadline') || lowerMessage.includes('due')) {
    intents.push('check_deadlines')
  }
  if (lowerMessage.includes('status') || lowerMessage.includes('progress')) {
    intents.push('check_status')
  }
  
  return intents
}

// Comprehensive Opportunity Analysis
async function analyzeAllOpportunities(userId, projects, opportunities, userProfile) {
  const analysis = {
    topMatches: [],
    summary: {
      totalAnalyzed: opportunities.length,
      highMatches: 0,
      mediumMatches: 0,
      urgentDeadlines: 0
    }
  }
  
  for (const project of projects || []) {
    for (const opportunity of opportunities) {
      const fitScore = calculateDetailedFitScore(project, opportunity, userProfile)
      const daysUntilDeadline = opportunity.deadline_date ? 
        Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
      
      const match = {
        project,
        opportunity,
        fitScore,
        daysUntilDeadline,
        recommendation: getRecommendation(fitScore, daysUntilDeadline),
        reasoning: generateReasoning(project, opportunity, fitScore)
      }
      
      if (fitScore >= 70) {
        analysis.topMatches.push(match)
        analysis.summary.highMatches++
      } else if (fitScore >= 50) {
        analysis.summary.mediumMatches++
      }
      
      if (daysUntilDeadline && daysUntilDeadline <= 14) {
        analysis.summary.urgentDeadlines++
      }
    }
  }
  
  // Sort by fit score
  analysis.topMatches.sort((a, b) => b.fitScore - a.fitScore)
  
  return analysis
}

// Detailed Fit Score Calculation
function calculateDetailedFitScore(project, opportunity, userProfile) {
  let score = 0
  
  // Project type alignment (25 points)
  if (opportunity.project_types?.includes(project.project_type)) score += 25
  else if (opportunity.project_types?.some(type => 
    type.includes(project.project_type?.split('_')[0]) || 
    project.project_type?.includes(type.split('_')[0])
  )) score += 15
  
  // Organization type match (20 points)
  if (opportunity.organization_types?.includes(userProfile.organization_type)) score += 20
  
  // Funding amount fit (20 points)
  if (opportunity.amount_min && opportunity.amount_max && project.funding_needed) {
    const needsRatio = project.funding_needed / opportunity.amount_max
    if (needsRatio <= 1) score += 20
    else if (needsRatio <= 1.5) score += 10
  }
  
  // Geographic match (10 points)
  if (opportunity.geography?.includes('nationwide')) score += 8
  else if (opportunity.geography?.some(geo => 
    project.location?.toLowerCase().includes(geo.toLowerCase())
  )) score += 10
  
  // Special qualifications (15 points total)
  if (opportunity.small_business_only && userProfile.small_business) score += 5
  if (opportunity.minority_business && userProfile.minority_owned) score += 5
  if (opportunity.woman_owned_business && userProfile.woman_owned) score += 5
  if (opportunity.veteran_owned_business && userProfile.veteran_owned) score += 5
  
  // Industry alignment (10 points)
  if (project.industry && opportunity.industry_focus?.includes(project.industry.toLowerCase())) {
    score += 10
  }
  
  return Math.min(score, 100)
}

// Recommendation Logic
function getRecommendation(fitScore, daysUntilDeadline) {
  if (fitScore >= 80) {
    if (daysUntilDeadline && daysUntilDeadline <= 7) return 'APPLY_IMMEDIATELY'
    return 'HIGHLY_RECOMMENDED'
  } else if (fitScore >= 60) {
    if (daysUntilDeadline && daysUntilDeadline <= 14) return 'CONSIDER_URGENT'
    return 'GOOD_MATCH'
  } else if (fitScore >= 40) {
    return 'MODERATE_FIT'
  }
  return 'LOW_PRIORITY'
}

// Generate Reasoning for Matches
function generateReasoning(project, opportunity, fitScore) {
  const reasons = []
  
  if (fitScore >= 80) {
    reasons.push(`Strong alignment between your ${project.project_type} project and ${opportunity.sponsor}'s funding priorities`)
  }
  
  if (project.funding_needed && opportunity.amount_max && project.funding_needed <= opportunity.amount_max) {
    reasons.push(`Funding amount matches your need ($${project.funding_needed.toLocaleString()})`)
  }
  
  return reasons.join('. ')
}

// Generate Analysis Response
async function generateOpportunityAnalysisResponse(analysis, projects) {
  const { topMatches, summary } = analysis
  
  let response = `I've analyzed ${summary.totalAnalyzed} opportunities against your ${projects.length} project(s).\n\n`
  
  if (topMatches.length > 0) {
    response += `🎯 Top Recommendations:\n\n`
    
    topMatches.slice(0, 3).forEach((match, index) => {
      response += `${index + 1}. ${match.opportunity.title} (${match.fitScore}% match)\n`
      response += `   • Sponsor: ${match.opportunity.sponsor}\n`
      response += `   • Project: ${match.project.name}\n`
      response += `   • Amount: ${match.opportunity.amount_max ? `Up to $${match.opportunity.amount_max.toLocaleString()}` : 'Varies'}\n`
      
      if (match.daysUntilDeadline) {
        response += `   • Deadline: ${match.daysUntilDeadline} days remaining\n`
      }
      
      response += `   • Recommendation: ${match.recommendation.replace('_', ' ')}\n\n`
    })
  }
  
  if (summary.urgentDeadlines > 0) {
    response += `⚠️ Urgent: ${summary.urgentDeadlines} opportunities have deadlines within 2 weeks.\n\n`
  }
  
  response += `Summary: ${summary.highMatches} high matches, ${summary.mediumMatches} medium matches found.\n\n`
  response += `Would you like me to provide detailed analysis for any specific opportunity?`
  
  return response
}

// Create Agent Decisions
async function createAgentDecision(userId, decisionData) {
  try {
    const { data, error } = await supabase
      .from('agent_decisions')
      .insert([{
        user_id: userId,
        type: decisionData.type,
        title: decisionData.title,
        description: decisionData.description,
        confidence: decisionData.confidence,
        priority: decisionData.priority,
        data: decisionData.data,
        status: 'pending',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    return data
  } catch (error) {
    console.error('Error creating agent decision:', error)
    return null
  }
}

// Create Opportunity Decisions
async function createOpportunityDecisions(userId, topMatches) {
  for (const match of topMatches.slice(0, 5)) { // Top 5 matches
    if (match.fitScore >= 70) {
      await createAgentDecision(userId, {
        type: 'opportunity_recommendation',
        title: `${match.fitScore}% match: ${match.opportunity.title}`,
        description: `Strong alignment with your "${match.project.name}" project. ${match.reasoning}`,
        confidence: match.fitScore,
        priority: match.fitScore >= 85 ? 'high' : 'medium',
        data: {
          opportunityId: match.opportunity.id,
          projectId: match.project.id,
          fitScore: match.fitScore,
          recommendation: match.recommendation,
          reasoning: match.reasoning,
          daysUntilDeadline: match.daysUntilDeadline
        }
      })
    }
  }
}

// Database Helper Functions
async function initializeAgentInDatabase(userId) {
  try {
    const { data: existingAgent } = await supabase
      .from('agent_activity_log')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'initialized')
      .single()
    
    if (existingAgent) {
      await supabase
        .from('agent_activity_log')
        .insert([{
          user_id: userId,
          activity_type: 'reinitialized',
          data: { timestamp: new Date().toISOString() }
        }])
    } else {
      await supabase
        .from('agent_activity_log')
        .insert([{
          user_id: userId,
          activity_type: 'initialized',
          data: { timestamp: new Date().toISOString() }
        }])
    }
  } catch (error) {
    console.error('Error in initializeAgentInDatabase:', error)
    throw error
  }
}

async function getUserContext(userId) {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
    
    return { 
      profile: profile || {}, 
      projects: projects || [] 
    }
  } catch (error) {
    console.error('Error getting user context:', error)
    return { profile: {}, projects: [] }
  }
}

async function createInitialGoals(userId, supabaseClient) {
  const goals = [
    {
      user_id: userId,
      description: 'Discover and analyze funding opportunities',
      type: 'opportunity_discovery',
      priority: 8,
      status: 'active',
      progress: 30,
      created_at: new Date().toISOString()
    },
    {
      user_id: userId,
      description: 'Monitor application deadlines',
      type: 'deadline_management',
      priority: 9,
      status: 'active',
      progress: 50,
      created_at: new Date().toISOString()
    },
    {
      user_id: userId,
      description: 'Track funding application status',
      type: 'application_tracking',
      priority: 7,
      status: 'active',
      progress: 20,
      created_at: new Date().toISOString()
    }
  ]
  
  try {
    if (!supabaseClient || !supabaseClient.from) {
      throw new Error('Invalid Supabase client provided')
    }

    const { data, error } = await supabaseClient
      .from('agent_goals')
      .insert(goals)
      .select()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating initial goals:', error)
    
    return goals.map((goal, index) => ({
      ...goal,
      id: `fallback_${Date.now()}_${index}`
    }))
  }
}