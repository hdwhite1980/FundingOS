// pages/api/ai/unified-agent/[...action].js
// Production-optimized unified AI agent API with comprehensive functionality

import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { unifiedAgentManager } from '../../../../lib/ai-agent/UnifiedManager'

export default async function handler(req, res) {
  const { action } = req.query
  
  // Initialize Supabase client for authentication
  const supabase = createPagesServerClient({ req, res })
  
  // Check authentication for most actions (except health-check)
  if (action[0] !== 'health-check') {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.log('Unified agent auth error:', authError?.message || 'No user found')
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Please log in to access AI agent features'
        })
      }
      
      // Use authenticated user's ID instead of from request body
      req.userId = user.id
    } catch (error) {
      console.error('Auth check failed:', error)
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Unable to verify user session'
      })
    }
  }

  const userId = req.userId || req.body?.userId || req.query?.userId

  if (!userId && action[0] !== 'health-check') {
    return res.status(400).json({ error: 'User ID required' })
  }

  try {
    switch (action[0]) {
      case 'initialize':
        try {
          console.log(`🚀 Initializing unified agent for user ${userId}`)
          
          // Start the unified agent through the manager
          const agent = await unifiedAgentManager.startAgentForUser(userId)
          
          // Get initial agent status and strategy
          const status = await unifiedAgentManager.getAgentStatus(userId)
          
          res.json({
            success: true,
            agentId: userId,
            status: 'active',
            agentType: 'unified',
            strategy: status.strategy,
            capabilities: [
              'Autonomous opportunity discovery',
              'Strategic funding planning', 
              'Automated application generation',
              'Real-time deadline monitoring',
              'Performance optimization',
              'Multi-channel funding coordination'
            ],
            message: 'Unified AI agent initialized successfully'
          })
        } catch (error) {
          console.error('Error initializing unified agent:', error)
          res.status(500).json({ error: 'Failed to initialize unified agent: ' + error.message })
        }
        break

      case 'chat':
        try {
          const { message, projects, opportunities, context } = req.body
          if (!message) {
            return res.status(400).json({ error: 'Message is required' })
          }

          console.log(`💬 Processing chat message for user ${userId}: "${message}"`)

          // Handle the message through the unified agent manager
          const response = await unifiedAgentManager.handleUserMessage(userId, message, {
            projects: projects || [],
            opportunities: opportunities || [],
            context: context || {}
          })

          // Store conversation in database
          await supabase.from('agent_conversations').insert([{
            user_id: userId,
            user_message: message,
            agent_response: response.message,
            agent_type: 'unified',
            context_data: context,
            actions_performed: response.actions || {},
            web_search_performed: response.webSearchPerformed || false,
            created_at: new Date().toISOString()
          }])

          res.json(response)
        } catch (error) {
          console.error('Chat error:', error)
          
          if (error.message.includes('rate limit')) {
            res.status(429).json({ error: error.message })
          } else if (error.message.includes('Message too long') || error.message.includes('Invalid message')) {
            res.status(400).json({ error: error.message })
          } else {
            res.status(500).json({ 
              message: "I'm having trouble processing your message right now. Let me continue working on your funding strategy in the background.",
              error: 'Chat service temporarily unavailable'
            })
          }
        }
        break

      case 'status':
        try {
          const status = await unifiedAgentManager.getAgentStatus(userId)
          res.json(status)
        } catch (error) {
          console.error('Status check error:', error)
          res.json({
            exists: false,
            status: 'unknown',
            message: 'Status unavailable',
            error: error.message
          })
        }
        break

      case 'goals':
        try {
          const goals = await unifiedAgentManager.getAgentGoals(userId)
          res.json(goals)
        } catch (error) {
          console.error('Goals error:', error)
          res.status(500).json({ error: 'Failed to load goals' })
        }
        break

      case 'decisions':
        try {
          const limit = parseInt(req.query.limit) || 10
          const decisions = await unifiedAgentManager.getAgentDecisions(userId, limit)
          res.json(decisions)
        } catch (error) {
          console.error('Decisions error:', error)
          res.status(500).json({ error: 'Failed to load decisions' })
        }
        break

      case 'metrics':
        try {
          const status = await unifiedAgentManager.getAgentStatus(userId)
          res.json(status.performance || {})
        } catch (error) {
          console.error('Metrics error:', error)
          res.status(500).json({ error: 'Failed to load metrics' })
        }
        break

      case 'toggle':
        try {
          const { status } = req.body
          
          let result
          if (status === 'paused') {
            result = await unifiedAgentManager.pauseAgentForUser(userId)
          } else {
            result = await unifiedAgentManager.resumeAgentForUser(userId)
          }
          
          // Log status change
          await supabase.from('agent_activity_log').insert([{
            user_id: userId,
            activity_type: 'status_changed',
            data: { new_status: status, timestamp: new Date().toISOString() }
          }])
          
          res.json(result)
        } catch (error) {
          console.error('Toggle error:', error)
          res.status(500).json({ error: 'Failed to toggle agent status' })
        }
        break

      case 'decision-feedback':
        try {
          const { decisionId, feedback } = req.body
          
          const result = await unifiedAgentManager.processDecisionFeedback(userId, decisionId, feedback)
          
          res.json(result)
        } catch (error) {
          console.error('Decision feedback error:', error)
          res.status(500).json({ error: 'Failed to process feedback' })
        }
        break

      case 'restart':
        try {
          const result = await unifiedAgentManager.restartAgentForUser(userId)
          res.json(result)
        } catch (error) {
          console.error('Restart error:', error)
          res.status(500).json({ error: 'Failed to restart agent' })
        }
        break

      case 'performance-report':
        try {
          // Get comprehensive performance data
          const [status, recentDecisions, recentConversations, goals] = await Promise.allSettled([
            unifiedAgentManager.getAgentStatus(userId),
            unifiedAgentManager.getAgentDecisions(userId, 20),
            supabase.from('agent_conversations')
              .select('*')
              .eq('user_id', userId)
              .eq('agent_type', 'unified')
              .order('created_at', { ascending: false })
              .limit(50),
            unifiedAgentManager.getAgentGoals(userId)
          ])

          const report = {
            agentStatus: status.status === 'fulfilled' ? status.value : null,
            recentDecisions: recentDecisions.status === 'fulfilled' ? recentDecisions.value : [],
            conversationCount: recentConversations.status === 'fulfilled' ? recentConversations.value?.data?.length || 0 : 0,
            activeGoals: goals.status === 'fulfilled' ? goals.value?.filter(g => g.status === 'active').length || 0 : 0,
            totalGoals: goals.status === 'fulfilled' ? goals.value?.length || 0 : 0,
            generatedAt: new Date().toISOString()
          }

          res.json(report)
        } catch (error) {
          console.error('Performance report error:', error)
          res.status(500).json({ error: 'Failed to generate performance report' })
        }
        break

      case 'strategy-update':
        try {
          // Trigger strategy update for the specific user
          const result = await unifiedAgentManager.broadcastToAllAgents(
            'Strategy update requested by user', 
            'update_strategy'
          )
          
          const userResult = result.find(r => r.userId === userId)
          
          if (userResult && userResult.status === 'success') {
            res.json({ success: true, message: 'Strategy update initiated' })
          } else {
            res.status(500).json({ error: 'Failed to update strategy' })
          }
        } catch (error) {
          console.error('Strategy update error:', error)
          res.status(500).json({ error: 'Failed to update strategy' })
        }
        break

      case 'search-opportunities':
        try {
          const { searchQuery, projectType, organizationType, location, fundingAmount, searchDepth } = req.body
          
          if (!searchQuery) {
            return res.status(400).json({ error: 'Search query is required' })
          }

          console.log(`🔍 Performing web search for user ${userId}: "${searchQuery}"`)

          // For now, return a mock response - in production, this would use actual search APIs
          const mockSearchResults = {
            opportunitiesFound: Math.floor(Math.random() * 10) + 5,
            opportunities: [
              {
                title: `Foundation Grant for ${projectType || 'Community Projects'}`,
                sponsor: 'Mock Foundation',
                amount_max: fundingAmount || 50000,
                deadline_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                description: `Mock opportunity matching your search for: ${searchQuery}`,
                source_url: 'https://mockfoundation.org/grants'
              }
            ],
            searchPerformed: true,
            query: searchQuery
          }

          // Log search activity
          await supabase.from('agent_search_log').insert([{
            user_id: userId,
            search_query: searchQuery,
            search_type: 'web_opportunities',
            results_count: mockSearchResults.opportunitiesFound,
            created_at: new Date().toISOString()
          }])

          res.json(mockSearchResults)
        } catch (error) {
          console.error('Search opportunities error:', error)
          res.status(500).json({ error: 'Failed to search opportunities' })
        }
        break

      case 'health-check':
        try {
          const systemStatus = await unifiedAgentManager.getSystemStatus()
          const agentStatus = await unifiedAgentManager.getAgentStatus(userId)
          
          res.json({
            system: systemStatus,
            agent: agentStatus,
            timestamp: new Date().toISOString()
          })
        } catch (error) {
          console.error('Health check error:', error)
          res.status(500).json({ error: 'Health check failed' })
        }
        break

      default:
        res.status(404).json({ error: 'Action not found' })
    }
  } catch (error) {
    console.error('Unified Agent API error:', error)
    res.status(500).json({ error: error.message })
  }
}

// Helper function to validate request data
function validateRequestData(action, body) {
  switch (action) {
    case 'chat':
      if (!body.message) return 'Message is required'
      if (body.message.length > 10000) return 'Message too long'
      break
    case 'decision-feedback':
      if (!body.decisionId || !body.feedback) return 'Decision ID and feedback are required'
      break
    case 'toggle':
      if (!body.status || !['active', 'paused'].includes(body.status)) return 'Valid status required'
      break
  }
  return null
}