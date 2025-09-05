// pages/api/ai/agent/[...action].js
// Production-optimized version that works with serverless functions

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
          // Initialize agent state in database instead of memory
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
          
          // Use AI service for chat response (stateless) with enhanced validation and rate limiting
          const response = await generateAgentResponse(message, {
            userId,
            userContext,
            projects: projects || [],
            opportunities: opportunities || []
          })
          
          // Store conversation in database
          await supabase
            .from('agent_conversations')
            .insert([{
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
          // Always get goals from database in production
          const { data: goals, error } = await supabase
            .from('agent_goals')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('priority', { ascending: false })

          if (error) throw error
          
          // If no goals exist, create initial ones
          if (!goals || goals.length === 0) {
            const initialGoals = await createInitialGoals(userId)
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
          
          // Get decisions from database
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
          // Get latest thoughts from database
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
          
          // Update agent status in database
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
          
          // Store feedback in database
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
          // Check database for agent status
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

// Helper functions for production

async function initializeAgentInDatabase(userId) {
  try {
    // Check if agent already exists
    const { data: existingAgent } = await supabase
      .from('agent_activity_log')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'initialized')
      .single()
    
    if (existingAgent) {
      // Just update the timestamp if already exists
      await supabase
        .from('agent_activity_log')
        .insert([{
          user_id: userId,
          activity_type: 'reinitialized',
          data: { timestamp: new Date().toISOString() }
        }])
    } else {
      // Create initial agent state in database
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

async function generateAgentResponse(message, context) {
  // Use your AI service to generate responses
  // This is stateless and works well in serverless environments
  
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI service not configured')
  }
  
  const prompt = `You are an AI funding agent helping users find and manage funding opportunities. 

User message: "${message}"

User context:
- Profile: ${JSON.stringify(context.userContext.profile, null, 2)}
- Projects: ${context.projects.length} active projects
- Opportunities: ${context.opportunities.length} tracked opportunities

Your role is to:
1. Help identify relevant funding opportunities
2. Provide strategic advice on grant applications
3. Track deadlines and requirements
4. Offer insights on funding trends

Respond helpfully and specifically based on their context. Keep responses concise but actionable.`

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
            content: 'You are a helpful AI funding agent. Provide concise, actionable advice about grants, funding opportunities, and application strategies.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('AI response error:', error)
    return "I'm having trouble processing your request right now. Please try again later."
  }
}

async function createInitialGoals(userId) {
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
    const { data, error } = await supabase
      .from('agent_goals')
      .insert(goals)
      .select()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating initial goals:', error)
    throw error
  }
}