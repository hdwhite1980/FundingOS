// pages/api/ai/agent/[...action].js
// Production-optimized AI agent with comprehensive user context and opportunity analysis

import { supabase } from '../../../../lib/supabase'
import { createClient } from '@supabase/supabase-js'

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

          console.log(`Processing chat message: "${message}"`)
          console.log(`Context: ${projects?.length || 0} projects, ${opportunities?.length || 0} opportunities`)

          // Get enhanced user context from database
          const userContext = await getUserContext(userId)
          
          // Get recent conversation history for context
          const conversationHistory = await getRecentConversationHistory(userId)
          console.log(`Retrieved ${conversationHistory.length} recent messages for context`)
          
          // Analyze message intent with conversation context
          const messageIntent = analyzeMessageIntent(message, conversationHistory)
          console.log('Message intent:', messageIntent)

          // Check if user is requesting web search or if we need more opportunities
          const needsWebSearch = detectWebSearchIntent(message) || 
            (messageIntent.includes('analyze_opportunities') && (!opportunities || opportunities.length < 5))
          
          if (needsWebSearch) {
            console.log('Triggering web search for opportunities...')
            
            try {
              // Perform web search for opportunities
              const searchResults = await performWebSearch(userId, message, projects, userContext.profile)
              
              if (searchResults.success && searchResults.opportunities.length > 0) {
                // Generate response about web search results
                const response = await generateWebSearchResponse(message, searchResults, projects)
                
                // Store conversation with search context
                await supabase.from('agent_conversations').insert([
                  {
                    user_id: userId,
                    role: 'user',
                    content: message,
                    metadata: { 
                      context_type: 'web_search',
                      timestamp: new Date().toISOString() 
                    },
                    created_at: new Date().toISOString()
                  },
                  {
                    user_id: userId,
                    role: 'assistant',
                    content: response,
                    metadata: { 
                      context_type: 'web_search',
                      context_data: {
                        search_query: searchResults.query,
                        results_found: searchResults.opportunitiesFound,
                        search_sources: searchResults.searchSources
                      },
                      timestamp: new Date().toISOString() 
                    },
                    created_at: new Date().toISOString()
                  }
                ])
                
                res.json({ 
                  message: response,
                  webSearchResults: searchResults.opportunities,
                  searchPerformed: true
                })
                return
              }
            } catch (searchError) {
              console.error('Web search failed:', searchError)
              // Create fallback response when web search fails
              const fallbackResponse = `I tried to search the internet for new opportunities, but encountered a technical issue with the web search service.

However, I can still help you with:
• Analyzing the ${opportunities?.length || 0} opportunities already in our database
• Providing detailed fits scores for your ${projects?.length || 0} projects
• Giving you strategic advice on funding approaches

Would you like me to analyze the current opportunities we have, or help you in another way?`

              // Store conversation with fallback context
              await supabase.from('agent_conversations').insert([
                {
                  user_id: userId,
                  role: 'user',
                  content: message,
                  metadata: { 
                    context_type: 'web_search_failed',
                    timestamp: new Date().toISOString() 
                  },
                  created_at: new Date().toISOString()
                },
                {
                  user_id: userId,
                  role: 'assistant',
                  content: fallbackResponse,
                  metadata: { 
                    context_type: 'web_search_fallback',
                    error_message: searchError.message,
                    timestamp: new Date().toISOString() 
                  },
                  created_at: new Date().toISOString()
                }
              ])
              
              res.json({ 
                message: fallbackResponse,
                webSearchFailed: true,
                error: searchError.message
              })
              return
              // Continue with regular chat if search fails
            }
          }
          
          // Handle opportunity analysis requests
          if (messageIntent.includes('analyze_opportunities')) {
            console.log('Handling opportunity analysis request...')
            
            // Check if user has opportunities and projects
            if (opportunities?.length > 0 && projects?.length > 0) {
              console.log('Performing comprehensive opportunity analysis...')
              
              // Ensure we have a valid profile or create a fallback
              const profileForAnalysis = userContext.profile || {
                organization_type: 'unknown',
                organization_name: 'Unknown Organization',
                small_business: false,
                woman_owned: false,
                minority_owned: false,
                veteran_owned: false
              }
              
              console.log('Using profile for analysis:', {
                organization_type: profileForAnalysis.organization_type,
                has_profile: !!userContext.profile
              })
              
              // Trigger comprehensive opportunity analysis
              const analysis = await analyzeAllOpportunities(userId, projects, opportunities, profileForAnalysis)
              
              // Create decisions for top opportunities
              if (analysis.topMatches.length > 0) {
                await createOpportunityDecisions(userId, analysis.topMatches)
                console.log(`Created ${analysis.topMatches.length} opportunity decisions`)
              }
              
              // Generate response with analysis
              const response = await generateOpportunityAnalysisResponse(analysis, projects)
              
              // Store conversation with analysis context
              await supabase.from('agent_conversations').insert([
                {
                  user_id: userId,
                  role: 'user',
                  content: message,
                  metadata: { 
                    context_type: 'opportunity_analysis',
                    timestamp: new Date().toISOString() 
                  },
                  created_at: new Date().toISOString()
                },
                {
                  user_id: userId,
                  role: 'assistant',
                  content: response,
                  metadata: { 
                    context_type: 'opportunity_analysis',
                    context_data: { analysis_summary: analysis.summary },
                    timestamp: new Date().toISOString() 
                  },
                  created_at: new Date().toISOString()
                }
              ])
              
              res.json({ message: response })
              return
            } else if (opportunities?.length > 0 && (!projects || projects.length === 0)) {
              // User has opportunities but no projects - guide them to create a project
              const response = `I'd be happy to help you find grant opportunities! However, I notice you don't have any projects created yet. To provide the most relevant grant recommendations, I need to understand your project details.

Would you like me to help you create your first project? I can guide you through:
- Describing your project idea and goals
- Identifying your organization type and location
- Setting your funding needs and timeline

Once you have a project created, I can analyze thousands of grant opportunities and show you the best matches for your specific needs. Would you like to get started with creating a project?`

              // Store conversation
              await supabase.from('agent_conversations').insert([
                {
                  user_id: userId,
                  role: 'user',
                  content: message,
                  metadata: { 
                    context_type: 'opportunity_analysis_no_projects',
                    timestamp: new Date().toISOString() 
                  },
                  created_at: new Date().toISOString()
                },
                {
                  user_id: userId,
                  role: 'assistant',
                  content: response,
                  metadata: { 
                    context_type: 'opportunity_analysis_no_projects',
                    timestamp: new Date().toISOString() 
                  },
                  created_at: new Date().toISOString()
                }
              ])
              
              res.json({ message: response })
              return
            } else {
              // No opportunities or projects - guide user to complete onboarding
              const response = `I'd love to help you find grant opportunities! To get started, I need to understand more about you and your project.

It looks like you might need to complete your profile setup first. Here's what I'll need:
- Your organization type (nonprofit, for-profit, individual, etc.)
- Your location
- Your project idea and funding needs

Once you complete your onboarding, I can search through thousands of grant opportunities and show you the best matches for your specific situation. Would you like me to guide you through setting up your profile?`

              // Store conversation
              await supabase.from('agent_conversations').insert([
                {
                  user_id: userId,
                  role: 'user',
                  content: message,
                  metadata: { 
                    context_type: 'opportunity_analysis_setup_needed',
                    timestamp: new Date().toISOString() 
                  },
                  created_at: new Date().toISOString()
                },
                {
                  user_id: userId,
                  role: 'assistant',
                  content: response,
                  metadata: { 
                    context_type: 'opportunity_analysis_setup_needed',
                    timestamp: new Date().toISOString() 
                  },
                  created_at: new Date().toISOString()
                }
              ])
              
              res.json({ message: response })
              return
            }
          }
          
          // Enhanced context for regular chat
          const enhancedContext = {
            userId,
            userContext,
            projects: projects || [],
            opportunities: opportunities || [],
            conversationHistory, // Add conversation history to context
            messageIntent, // Add intent analysis to context
            // Add formatted opportunity details for better AI understanding
            opportunityDetails: opportunities?.map(opp => ({
              title: opp.title,
              sponsor: opp.sponsor,
              amount_max: opp.amount_max,
              deadline_date: opp.deadline_date,
              project_types: opp.project_types,
              organization_types: opp.organization_types,
              geography: opp.geography,
              description: opp.description
            })) || []
          }
          
          // Generate enhanced chat response
          const response = await generateEnhancedAgentResponse(message, enhancedContext)
          
          // Store conversation in database
          await supabase.from('agent_conversations').insert([
            {
              user_id: userId,
              role: 'user',
              content: message,
              metadata: { 
                messageIntent: messageIntent,
                timestamp: new Date().toISOString() 
              },
              created_at: new Date().toISOString()
            },
            {
              user_id: userId,
              role: 'assistant',
              content: response,
              metadata: { 
                projects_count: projects?.length || 0,
                opportunities_count: opportunities?.length || 0,
                timestamp: new Date().toISOString() 
              },
              created_at: new Date().toISOString()
            }
          ])
          
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
            .maybeSingle()

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
            .maybeSingle()
          
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

      case 'update-progress':
        try {
          // Update goal progress based on real user activity
          const { data: goals, error: goalError } = await supabase
            .from('agent_goals')
            .select('*')
            .eq('user_id', userId)

          if (goalError) throw goalError

          // Calculate and update progress for each goal
          for (const goal of goals || []) {
            const newProgress = await calculateGoalProgress(userId, goal.type, supabase)
            
            const { error: updateError } = await supabase
              .from('agent_goals')
              .update({ progress: newProgress })
              .eq('id', goal.id)

            if (updateError) {
              console.error(`Error updating progress for goal ${goal.id}:`, updateError)
            }
          }

          // Return updated goals
          const { data: updatedGoals, error: fetchError } = await supabase
            .from('agent_goals')
            .select('*')
            .eq('user_id', userId)
            .order('priority', { ascending: false })

          if (fetchError) throw fetchError

          res.json(updatedGoals || [])
        } catch (error) {
          console.error('Update progress error:', error)
          res.status(500).json({ error: 'Failed to update goal progress' })
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

// NEW: Enhanced response generator with better opportunity formatting and conversation context
async function generateEnhancedAgentResponse(message, context) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI service not configured')
  }
  
  const { userContext, projects, opportunities, opportunityDetails, conversationHistory, messageIntent } = context
  const { profile, fundingStats, summary } = userContext
  
  // Format conversation history for AI context
  const conversationContext = formatConversationHistory(conversationHistory)
  
  // Detect if this is a follow-up response
  const isFollowUp = messageIntent.some(intent => 
    ['continue_previous', 'continue_analysis', 'expand_opportunity_analysis', 'expand_deadline_info'].includes(intent)
  )
  
  // Format projects clearly - filter out null/invalid projects
  const validProjects = (projects || []).filter(p => p && typeof p === 'object' && p.name)
  const projectSummary = validProjects.length > 0 ? 
    validProjects.map(p => `• "${p.name}" - ${p.project_type?.replace('_', ' ') || 'project type TBD'} project needing $${(p.funding_needed || p.total_project_budget || p.funding_request_amount || 0).toLocaleString()} in ${p.location || 'location TBD'}`).join('\n') : 
    'No active projects'
  
  // Format opportunities with REAL data
  const opportunitySummary = opportunityDetails.length > 0 ? 
    opportunityDetails.slice(0, 5).map(opp => {
      const deadline = opp.deadline_date ? 
        `Deadline: ${new Date(opp.deadline_date).toLocaleDateString()}` : 
        'Rolling deadline'
      const amount = opp.amount_max ? 
        `Up to $${opp.amount_max.toLocaleString()}` : 
        'Amount varies'
      return `• "${opp.title}" from ${opp.sponsor} - ${amount}, ${deadline}`
    }).join('\n') : 
    'No opportunities currently available'

  // Format funding status clearly
  const fundingOverview = `
Current Funding Status:
- Total funding needed: $${summary?.totalFundingNeeded?.toLocaleString() || '0'}
- Amount secured: $${summary?.totalSecured?.toLocaleString() || '0'}
- Remaining gap: $${summary?.fundingGap?.toLocaleString() || '0'}
- Progress: ${summary?.fundingProgress || 0}%

Recent Activity:
- Individual donations: $${fundingStats?.totalRaised?.toLocaleString() || '0'} from ${fundingStats?.totalDonors || 0} donors
- Grant applications: ${fundingStats?.totalApplications || 0} submitted, ${fundingStats?.approvedApplications || 0} approved
- Active campaigns: ${fundingStats?.activeCampaigns || 0} crowdfunding campaigns`

  try {
    // Detect simple data queries for direct answers
    const isSimpleQuery = detectSimpleDataQuery(message)
    console.log(`Simple query detected: ${isSimpleQuery} for message: "${message}"`)
    
    let prompt, maxTokens = 1200

    if (isSimpleQuery) {
      maxTokens = 300 // Shorter responses for simple queries
      prompt = `Answer this specific question directly and concisely using the user's actual data:

QUESTION: "${message}"

CONVERSATION CONTEXT:
${conversationContext}

FUNDING DATA:
- Individual donations: ${fundingStats?.totalRaised?.toLocaleString() || '0'} from ${fundingStats?.totalDonors || 0} donors
- Grant funding awarded: ${fundingStats?.totalAwarded?.toLocaleString() || '0'} from ${fundingStats?.approvedApplicationions || 0} approved applications  
- Crowdfunding raised: ${fundingStats?.totalCampaignRaised?.toLocaleString() || '0'} from ${fundingStats?.activeCampaigns || 0} active campaigns
- Total funding secured: ${summary?.totalSecured?.toLocaleString() || '0'}
- Total funding needed: ${summary?.totalFundingNeeded?.toLocaleString() || '0'}
- Funding gap: ${summary?.fundingGap?.toLocaleString() || '0'}

Give a direct, factual answer. Be brief and specific. Do not provide strategy advice unless asked.`
    } else if (isFollowUp) {
      // Special handling for follow-up responses
      prompt = `You are continuing a conversation with a user. They just responded with "${message}" to your previous message. 

CONVERSATION HISTORY:
${conversationContext}

USER PROFILE:
- Organization: ${profile?.organization_name || 'Organization'} (${profile?.organization_type || 'Type not specified'})
- Location: ${profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : 'Location not specified'}

CURRENT STATUS:
${fundingOverview}

PROJECTS:
${projectSummary}

AVAILABLE OPPORTUNITIES:
${opportunitySummary}

Provide a natural, conversational response that continues the discussion contextually. If they said "yes" or agreed to something, proceed with what you offered. If they asked for "more details", expand on the topic you were discussing. Be specific and reference their actual data.`
    } else {
      // Standard comprehensive response
      prompt = `You are an AI funding strategist providing specific, actionable advice.

USER MESSAGE: "${message}"

CONVERSATION CONTEXT:
${conversationContext}

ORGANIZATION: ${profile?.organization_name || 'Organization'} (${profile?.organization_type || 'Type not specified'})
LOCATION: ${profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : 'Location not specified'}

PROJECTS:
${projectSummary}

FUNDING STATUS:
${fundingOverview}

AVAILABLE OPPORTUNITIES:
${opportunitySummary}

INSTRUCTIONS:
- Be specific and use actual data from their profile
- Reference real opportunity titles, deadlines, and amounts
- Provide actionable recommendations based on their funding gap and project needs
- If discussing deadlines, use the actual dates provided
- Be conversational but data-driven
- Use line breaks for readability
- Consider the conversation history when formulating your response

Respond with specific, personalized advice based on their actual data and conversation context.`
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Best model for conversational AI and strategic advice
        messages: [
          {
            role: 'system',
            content: isSimpleQuery ? 
              'You are a data assistant. Provide direct, factual answers using only the data provided. Be concise and specific. Do not give advice unless requested.' :
              isFollowUp ?
              'You are an expert funding strategist continuing a conversation. Be natural and contextual. Reference the conversation history and respond appropriately to their follow-up. Never use placeholder text like "[Insert Deadline]" - always use the actual data provided.' :
              'You are an expert funding strategist. Provide specific, actionable advice using the user\'s actual data. Reference real opportunity titles, amounts, and deadlines. Be conversational and helpful. Never use placeholder text like "[Insert Deadline]" - always use the actual data provided.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: isSimpleQuery ? 0.3 : 0.7
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    
    const data = await response.json()
    let agentResponse = data.choices[0].message.content

    // Clean up formatting
    agentResponse = agentResponse
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
      .replace(/\n{3,}/g, '\n\n') // Limit excessive line breaks
      .replace(/\[Insert.*?\]/g, 'TBD') // Replace any placeholder text
      .trim()

    return agentResponse
  } catch (error) {
    console.error('AI response error:', error)
    return `I'm analyzing your funding situation. I can see you have ${projects.length} project(s) and ${opportunities.length} opportunity(ies) to review. Let me continue processing this information and get back to you with specific recommendations.`
  }
}

// Format conversation history for AI context
function formatConversationHistory(conversationHistory) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return "This is the start of our conversation."
  }
  
  // Get last 6 messages for context (3 exchanges)
  const recentHistory = conversationHistory.slice(-6)
  
  return recentHistory.map(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant'
    const timestamp = new Date(msg.timestamp).toLocaleTimeString()
    return `${role} (${timestamp}): ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`
  }).join('\n')
}

// Enhanced AI Response Function with Data-Driven Context
async function generateAgentResponse(message, context) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI service not configured')
  }
  
  const { userContext, projects, opportunities } = context
  const { profile, fundingStats, summary, donations, campaigns, applications } = userContext
  
  // Build comprehensive context string with null checks
  const validProjects = (projects || []).filter(p => p && typeof p === 'object' && p.name)
  const projectContext = validProjects.length > 0 ? 
    `Active Projects: ${validProjects.map(p => `"${p.name}" (${p.project_type || 'type TBD'}, ${(p.funding_needed || p.total_project_budget || p.funding_request_amount || 0).toLocaleString()} needed)`).join(', ')}` : 
    'No active projects'
  
  const opportunityContext = opportunities.length > 0 ? 
    `Available Opportunities: ${opportunities.length} funding opportunities tracked` : 
    'No opportunities currently tracked'

  // Comprehensive funding status context
  const fundingContext = `
Funding Status:
- Total needed across all projects: ${summary.totalFundingNeeded?.toLocaleString() || '0'}
- Total secured so far: ${summary.totalSecured?.toLocaleString() || '0'}
- Remaining funding gap: ${summary.fundingGap?.toLocaleString() || '0'}
- Funding progress: ${summary.fundingProgress || 0}%
- Diversification score: ${summary.diversificationScore || 0}/100

Fundraising Activity:
- Individual donations: ${fundingStats.totalRaised ? `${fundingStats.totalRaised.toLocaleString()}` : '$0'} from ${fundingStats.totalDonors || 0} donors
- Crowdfunding campaigns: ${campaigns?.length || 0} campaigns (${fundingStats.activeCampaigns || 0} active)
- Grant applications: ${applications?.length || 0} submitted (${fundingStats.approvedApplications || 0} approved, ${fundingStats.pendingApplications || 0} pending)
- Total grant funding awarded: ${fundingStats.totalAwarded?.toLocaleString() || '0'}`.trim()

  const prompt = `You are an AI funding agent with comprehensive knowledge of the user's funding ecosystem.

User message: "${message}"

ORGANIZATION PROFILE:
- Name: ${profile?.organization_name || 'Not specified'}
- Type: ${profile?.organization_type || 'Not specified'}
- Location: ${profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : 'Not specified'}
- Certifications: ${formatCertifications(profile)}

PROJECTS:
${projectContext}

FUNDING LANDSCAPE:
${fundingContext}

OPPORTUNITIES:
${opportunityContext}

Your capabilities include:
1. **Comprehensive Funding Strategy**: Analyze across donations, crowdfunding, and grants
2. **Funding Gap Analysis**: Identify priorities based on project needs vs. secured funding
3. **Diversification Advice**: Recommend optimal funding mix based on current portfolio
4. **Performance Insights**: Evaluate success rates and suggest improvements
5. **Strategic Planning**: Connect funding activities to achieve project goals

When providing advice:
- Consider their current funding mix and suggest optimizations
- Highlight funding gaps and recommend specific actions
- Reference their actual performance data when relevant
- Provide actionable next steps based on their complete funding picture

Respond conversationally with specific, data-driven insights. Use their actual numbers and achievements to provide personalized guidance.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Best model for strategic funding advice
        messages: [
          {
            role: 'system',
            content: 'You are an expert funding strategist and AI agent. Provide specific, actionable advice based on the user\'s complete funding data. Reference their actual numbers, performance, and funding mix. Be conversational but data-driven. Use line breaks for readability.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }
    
    const data = await response.json()
    let agentResponse = data.choices[0].message.content

    // Clean up formatting
    agentResponse = agentResponse
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
      .replace(/\n{3,}/g, '\n\n') // Limit excessive line breaks
      .trim()

    return agentResponse
  } catch (error) {
    console.error('AI response error:', error)
    return "I'm having trouble processing your request right now. Let me continue monitoring your funding opportunities and analyzing your funding performance in the background."
  }
}

// Improved opportunity analysis response function
async function generateOpportunityAnalysisResponse(analysis, projects) {
  const { topMatches, summary } = analysis
  
  if (!topMatches || topMatches.length === 0) {
    return `I've analyzed ${summary.totalAnalyzed} opportunities against your ${projects.length} project(s), but didn't find any strong matches above 70%.

This could mean:
• The current opportunities don't align well with your project types
• You might need to adjust your project descriptions for better matching
• New opportunities may be coming soon

I'll continue monitoring for better matches. Would you like me to analyze what types of opportunities would be ideal for your projects?`
  }
  
  let response = `I've completed my analysis of ${summary.totalAnalyzed} opportunities for your ${projects.length} project(s). Here's what I found:\n\n`
  
  // Top recommendations with real data
  response += `🎯 **Top Recommendations:**\n\n`
  
  topMatches.slice(0, 3).forEach((match, index) => {
    const deadline = match.opportunity.deadline_date ? 
      `Deadline: ${new Date(match.opportunity.deadline_date).toLocaleDateString()}` : 
      'Rolling deadline'
    
    const amount = match.opportunity.amount_max ? 
      `Up to $${match.opportunity.amount_max.toLocaleString()}` : 
      'Amount varies'
    
    const daysLeft = match.daysUntilDeadline ? 
      ` (${match.daysUntilDeadline} days remaining)` : 
      ''
    
    response += `${index + 1}. **${match.opportunity.title}** - ${match.fitScore}% match
   • Sponsor: ${match.opportunity.sponsor}
   • For project: "${match.project.name}"
   • Funding: ${amount}
   • ${deadline}${daysLeft}
   • Recommendation: ${match.recommendation.replace(/_/g, ' ').toLowerCase()}
   • Why it's a good fit: ${match.reasoning || 'Strong alignment with your project goals'}

`
  })
  
  // Urgency alerts
  if (summary.urgentDeadlines > 0) {
    response += `⚠️ **Urgent Action Needed:**\n`
    response += `${summary.urgentDeadlines} opportunities have deadlines within 2 weeks. I recommend prioritizing these for immediate review.\n\n`
  }
  
  // Summary statistics
  response += `**Analysis Summary:**\n`
  response += `• ${summary.highMatches} high-quality matches (70%+ fit score)\n`
  response += `• ${summary.mediumMatches} moderate matches (50-69% fit score)\n`
  response += `• ${summary.urgentDeadlines} opportunities with urgent deadlines\n\n`
  
  // Next steps
  response += `**Recommended Next Steps:**\n`
  response += `1. Review the top ${Math.min(3, topMatches.length)} recommendations above\n`
  response += `2. Check application requirements for your priority opportunities\n`
  response += `3. Start preparing application materials for urgent deadlines\n\n`
  
  response += `Would you like me to provide detailed analysis for any specific opportunity, or help you prioritize based on your funding timeline?`
  
  return response
}

// Helper function for certifications
function formatCertifications(profile) {
  if (!profile) return 'None'
  
  const certs = []
  if (profile.small_business) certs.push('Small Business')
  if (profile.minority_owned) certs.push('Minority-Owned')
  if (profile.woman_owned) certs.push('Woman-Owned')
  if (profile.veteran_owned) certs.push('Veteran-Owned')
  
  return certs.length > 0 ? certs.join(', ') : 'None'
}

// Detect simple data queries that need direct answers
function detectSimpleDataQuery(message) {
  const lowerMessage = message.toLowerCase()
  
  const simpleQueries = [
    // Donation queries - broader patterns
    /do i have.*donations?/,
    /any donations?/,
    /how much.*donations?/,
    /total.*donations?/,
    /donation.*amount/,
    /how many.*donors?/,
    /donations.*received/,
    
    // Campaign queries  
    /how much.*raised/,
    /campaign.*raised/,
    /crowdfunding.*amount/,
    /any.*campaigns?/,
    
    // Grant queries
    /how much.*grants?/,
    /grant.*funding/,
    /total.*awarded/,
    /any.*grants?/,
    
    // General funding queries
    /how much.*funding/,
    /total.*secured/,
    /funding.*gap/,
    /how much.*need/,
    /do i have.*funding/,
    
    // Status queries
    /funding.*status/,
    /current.*funding/,
    /progress.*funding/,
    
    // Simple yes/no questions
    /do i have any/,
    /have i received/
  ]
  
  // Also check for key phrases
  const keyPhrases = [
    'how much in donations',
    'do i have donations',
    'any donations',
    'total donations',
    'how much funding',
    'funding secured',
    'how many donors'
  ]
  
  const hasPattern = simpleQueries.some(pattern => pattern.test(lowerMessage))
  const hasPhrase = keyPhrases.some(phrase => lowerMessage.includes(phrase))
  
  return hasPattern || hasPhrase
}

// Get recent conversation history for context
async function getRecentConversationHistory(userId, limit = 20) {
  try {
    // Try the new schema first, fallback to old schema if it fails
    let { data: conversations, error } = await supabase
      .from('agent_conversations')
      .select('role, content, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // If role column doesn't exist, try fallback selection
    if (error && error.code === '42703') {
      console.log('Role column not found, trying fallback query...')
      const fallbackResult = await supabase
        .from('agent_conversations')
        .select('user_message, agent_response, created_at, context_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (fallbackResult.error) {
        console.error('Fallback conversation query failed:', fallbackResult.error)
        return []
      }
      
      // Convert fallback format to expected format
      conversations = []
      fallbackResult.data?.forEach(conv => {
        if (conv.user_message) {
          conversations.push({
            role: 'user',
            content: conv.user_message,
            timestamp: conv.created_at,
            metadata: conv.context_data || {}
          })
        }
        if (conv.agent_response) {
          conversations.push({
            role: 'assistant', 
            content: conv.agent_response,
            timestamp: conv.created_at,
            metadata: conv.context_data || {}
          })
        }
      })
    } else if (error) {
      console.error('Error fetching conversation history:', error)
      return []
    }

    if (!conversations || conversations.length === 0) {
      return []
    }

    // Reverse to get chronological order and format for AI context
    return conversations.reverse().map(conv => ({
      role: conv.role,
      content: conv.content,
      timestamp: conv.created_at,
      metadata: conv.metadata || {}
    }))
  } catch (error) {
    console.error('Error in getRecentConversationHistory:', error)
    return []
  }
}

// Message Intent Analysis with conversation context
function analyzeMessageIntent(message, conversationHistory = []) {
  const intents = []
  const lowerMessage = message.toLowerCase().trim()
  
  // Get the most recent agent message for context
  const lastAgentMessage = conversationHistory
    .filter(msg => msg.role === 'assistant')
    .pop()
  
  // Detect follow-up responses
  const isFollowUp = detectFollowUpResponse(lowerMessage, lastAgentMessage)
  
  if (isFollowUp) {
    console.log('Detected follow-up response to:', lastAgentMessage?.content?.substring(0, 100) + '...')
    
    // Map follow-up intent based on previous agent context
    const followUpIntent = mapFollowUpIntent(lowerMessage, lastAgentMessage)
    if (followUpIntent) {
      intents.push(followUpIntent)
    }
  } else {
    // Standard intent analysis for new requests
    if (lowerMessage.includes('analyz') || lowerMessage.includes('recommend') || lowerMessage.includes('should i apply')) {
      intents.push('analyze_opportunities')
    }
    if (lowerMessage.includes('deadline') || lowerMessage.includes('due')) {
      intents.push('check_deadlines')
    }
    if (lowerMessage.includes('status') || lowerMessage.includes('progress') || lowerMessage.includes('portfolio')) {
      intents.push('check_status')
    }
    if (lowerMessage.includes('diversif') || lowerMessage.includes('balance') || lowerMessage.includes('spread')) {
      intents.push('diversification_analysis')
    }
  }
  
  return intents
}

// Detect if message is a follow-up response
function detectFollowUpResponse(lowerMessage, lastAgentMessage) {
  const followUpPatterns = [
    /^(yes|yeah|yep|sure|okay|ok|absolutely|definitely)$/,
    /^(no|nope|nah|not really)$/,
    /^(tell me more|more info|details|elaborate|explain)$/,
    /^(continue|proceed|go ahead|next)$/,
    /^(that sounds good|sounds great|i'm interested)$/,
    /^(skip|pass|maybe later|not now)$/,
    /^(help|assist|guide me)$/,
  ]
  
  const isShortResponse = lowerMessage.length <= 25
  const matchesPattern = followUpPatterns.some(pattern => pattern.test(lowerMessage))
  const hasRecentAgentMessage = lastAgentMessage && 
    (Date.now() - new Date(lastAgentMessage.timestamp).getTime()) < 10 * 60 * 1000 // 10 minutes
  
  return isShortResponse && matchesPattern && hasRecentAgentMessage
}

// Map follow-up responses to appropriate intents
function mapFollowUpIntent(lowerMessage, lastAgentMessage) {
  if (!lastAgentMessage) return null
  
  const lastContent = lastAgentMessage.content.toLowerCase()
  const contextType = lastAgentMessage.metadata?.context_type
  
  // Positive responses
  if (/^(yes|yeah|yep|sure|okay|ok|absolutely|definitely)$/.test(lowerMessage)) {
    if (lastContent.includes('analyze') || lastContent.includes('opportunities')) {
      return 'analyze_opportunities'
    }
    if (lastContent.includes('search') || lastContent.includes('find more')) {
      return 'web_search'
    }
    if (lastContent.includes('deadline') || lastContent.includes('urgent')) {
      return 'check_deadlines'
    }
    if (contextType === 'opportunity_analysis') {
      return 'continue_analysis'
    }
    return 'continue_previous'
  }
  
  // More info requests
  if (/^(tell me more|more info|details|elaborate|explain)$/.test(lowerMessage)) {
    if (contextType === 'opportunity_analysis') {
      return 'expand_opportunity_analysis'
    }
    if (lastContent.includes('deadline') || contextType === 'deadline_check') {
      return 'expand_deadline_info'
    }
    return 'expand_previous'
  }
  
  // Continue/proceed responses
  if (/^(continue|proceed|go ahead|next)$/.test(lowerMessage)) {
    return 'continue_previous'
  }
  
  // Negative responses
  if (/^(no|nope|nah|not really|skip|pass|maybe later|not now)$/.test(lowerMessage)) {
    return 'skip_previous'
  }
  
  return null
}

// Detect if user is requesting web search
function detectWebSearchIntent(message) {
  const lowerMessage = message.toLowerCase()
  
  const searchKeywords = [
    'search online',
    'search the internet',
    'search web',
    'find online',
    'look online',
    'search for more',
    'find more opportunities',
    'web search',
    'internet search',
    'search outside',
    'external search',
    'broader search'
  ]
  
  const searchPhrases = [
    'need more opportunities',
    'not enough opportunities',
    'find additional',
    'search beyond',
    'look elsewhere',
    'other sources'
  ]
  
  return searchKeywords.some(keyword => lowerMessage.includes(keyword)) ||
         searchPhrases.some(phrase => lowerMessage.includes(phrase))
}

// Perform web search for opportunities
async function performWebSearch(userId, message, projects, userProfile) {
  try {
    console.log('🔍 Starting direct web search for opportunities...')
    
    // Build search query based on message and user context
    let searchQuery = message
    
    // If message is general, build query from user context
    if (message.length < 50 && projects?.length > 0) {
      const projectTypes = projects.map(p => p.project_type).join(' ')
      const organizationType = (Array.isArray(userProfile?.organization_types) && userProfile.organization_types.length > 0)
        ? userProfile.organization_types[0]
        : (userProfile?.organization_type || 'unknown')
      searchQuery = `${projectTypes} grants ${organizationType} funding opportunities`
    }
    
    console.log('🔍 Executing direct search for:', searchQuery)
    
    // Execute both searches in parallel (directly, no HTTP calls)
    const [webResults, dbResults] = await Promise.all([
      searchWithSerperAPIDirect(searchQuery, projects?.[0]?.project_type, userProfile?.organization_type),
      searchDatabaseDirect(searchQuery, projects?.[0]?.project_type, userProfile?.organization_type)
    ])
    
    // Combine results
    const allOpportunities = [...webResults, ...dbResults]
    
    // Save new web search results to database
    if (webResults.length > 0) {
      try {
        console.log(`💾 Saving ${webResults.length} new web opportunities to database...`)
        await saveWebResultsToDatabase(webResults, searchQuery, userId)
        console.log('✅ Successfully saved web results to database')
      } catch (saveError) {
        console.error('❌ Failed to save web results:', saveError.message)
        // Don't fail the search if saving fails
      }
    }
    
    const searchSources = []
    if (webResults.length > 0) searchSources.push('serper_web_search')
    if (dbResults.length > 0) searchSources.push('database_search')
    
    console.log('✅ Direct search complete:', webResults.length, 'web +', dbResults.length, 'database =', allOpportunities.length, 'total')

    return {
      success: true,
      query: searchQuery,
      opportunitiesFound: allOpportunities.length,
      opportunities: allOpportunities,
      searchSources,
      searchBreakdown: {
        webResults: webResults.length,
        databaseResults: dbResults.length,
        serperApiEnabled: !!process.env.SERPER_API_KEY
      },
      timestamp: new Date().toISOString(),
      searchMethod: 'direct_serper_plus_database'
    }
    
  } catch (error) {
    console.error('Web search error:', error)
    
    // Fallback to database search only
    try {
      const fallbackResults = await searchDatabaseDirect(message, projects?.[0]?.project_type, userProfile?.organization_type)
      
      return {
        success: true,
        query: message,
        opportunitiesFound: fallbackResults?.length || 0,
        opportunities: fallbackResults || [],
        searchSources: ['emergency_database_fallback'],
        timestamp: new Date().toISOString(),
        searchMethod: 'emergency_fallback',
        note: 'Web search failed, showing database results',
        error: error.message
      }
    } catch (fallbackError) {
      console.error('All search methods failed:', fallbackError)
      return { success: false, opportunities: [], error: 'All search methods failed' }
    }
  }
}

// Generate response for web search results
async function generateWebSearchResponse(originalMessage, searchResults, projects) {
  const { query, opportunitiesFound, opportunities } = searchResults
  
  if (opportunitiesFound === 0) {
    return `I searched the internet for funding opportunities related to your request: "${originalMessage}"

Unfortunately, I didn't find any relevant opportunities online at the moment. This could mean:
• The search terms might need to be more specific
• Most current opportunities are already in our federal database
• New opportunities may not be publicly listed yet

I'll continue monitoring and will alert you when new opportunities become available. You can also try asking me to search for specific types of funding like "search for environmental grants" or "find education funding opportunities."`
  }
  
  let response = `Great news! I searched the internet and found **${opportunitiesFound} new funding opportunities** that might interest you.\n\n`
  
  response += `🔍 **Search Results for:** "${query}"\n\n`
  
  // Show top results
  const topResults = opportunities.slice(0, 3)
  response += `**Top Discoveries:**\n\n`
  
  topResults.forEach((opp, index) => {
    response += `${index + 1}. **${opp.title}**\n`
    
    // Handle both database results (source_url) and web search results (url)
    const sourceUrl = opp.source_url || opp.url
    if (sourceUrl) {
      try {
        response += `   • Source: ${new URL(sourceUrl).hostname}\n`
      } catch (e) {
        response += `   • Source: ${opp.domain || 'Web Search'}\n`
      }
    } else {
      response += `   • Source: ${opp.domain || 'Database'}\n`
    }
    
    response += `   • Relevance: ${opp.relevance_score || 'High'} match\n`
    if (opp.amount_info) {
      response += `   • Funding: ${opp.amount_info}\n`
    }
    if (opp.deadline_info) {
      response += `   • Deadline: ${opp.deadline_info}\n`
    }
    response += `   • Details: ${opp.description.substring(0, 150)}...\n`
    response += `   • Link: ${opp.source_url}\n\n`
  })
  
  if (opportunitiesFound > 3) {
    response += `And ${opportunitiesFound - 3} more opportunities discovered!\n\n`
  }
  
  response += `**Next Steps:**\n`
  response += `1. Review these opportunities and visit the links for full details\n`
  response += `2. Check application requirements and deadlines\n`
  response += `3. I've saved these discoveries for future reference\n\n`
  
  response += `Would you like me to analyze how these new opportunities match your specific projects, or search for more opportunities in a particular area?`
  
  return response
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
      
      if (fitScore >= 60) {  // Lowered from 70 since we're being more strict
        analysis.topMatches.push(match)
        analysis.summary.highMatches++
      } else if (fitScore >= 40) {  // Lowered from 50
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

// Detailed Fit Score Calculation - OBJECTIVE EVALUATION ONLY
function calculateDetailedFitScore(project, opportunity, userProfile) {
  let score = 0
  
  // Ensure userProfile is not null
  const profile = userProfile || {
    organization_type: 'unknown',
    small_business: false,
    woman_owned: false,
    minority_owned: false,
    veteran_owned: false
  }
  
  // Organization type match (STRICT) - 25 points
  if (opportunity.organization_types && opportunity.organization_types.length > 0) {
    if (!profile.organization_type || profile.organization_type === 'unknown') {
      // No points if org type not specified
      score += 0
    } else if (opportunity.organization_types.includes(profile.organization_type)) {
      score += 25
    } else if (opportunity.organization_types.includes('all')) {
      score += 20
    } else {
      // Org type doesn't match - this is a major issue
      score += 0
    }
  } else {
    // No org type requirements
    score += 15
  }
  
  // Project type alignment (STRICT) - 25 points
  if (opportunity.project_types && opportunity.project_types.length > 0) {
    if (opportunity.project_types.includes(project.project_type)) {
      score += 25
    } else if (opportunity.project_types.some(type => 
      project.project_type && type.includes(project.project_type.split('_')[0])
    )) {
      score += 10 // Partial match only gets partial points
    } else {
      score += 0 // No match
    }
  } else {
    // No specific project type requirements
    score += 10
  }
  
  // Funding amount fit (REALISTIC) - 25 points
  if (opportunity.amount_min && opportunity.amount_max && project.funding_needed) {
    if (project.funding_needed >= opportunity.amount_min && project.funding_needed <= opportunity.amount_max) {
      score += 25 // Perfect fit
    } else if (project.funding_needed <= opportunity.amount_max) {
      score += 15 // Under max but might be under minimum
    } else {
      score += 0 // Over maximum
    }
  }
  
  // Geographic match - 15 points
  if (opportunity.geography && opportunity.geography.length > 0) {
    if (opportunity.geography.includes('nationwide') || opportunity.geography.includes('national')) {
      score += 15
    } else if (project.location && opportunity.geography.some(geo => 
      project.location.toLowerCase().includes(geo.toLowerCase())
    )) {
      score += 15
    } else {
      score += 0 // No geographic match
    }
  }
  
  // Special qualifications (ONLY if explicitly specified) - 10 points max
  let specialQualPoints = 0
  if (opportunity.small_business_only && profile.small_business) specialQualPoints += 3
  if (opportunity.minority_business && profile.minority_owned) specialQualPoints += 3
  if (opportunity.woman_owned_business && profile.woman_owned) specialQualPoints += 2
  if (opportunity.veteran_owned_business && profile.veteran_owned) specialQualPoints += 2
  score += Math.min(specialQualPoints, 10)
  
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

// Generate HONEST Reasoning for Matches
function generateReasoning(project, opportunity, fitScore) {
  const reasons = []
  const issues = []
  
  // Check organization type alignment
  if (opportunity.organization_types && opportunity.organization_types.length > 0) {
    if (!project.organization_type || project.organization_type === 'unknown') {
      issues.push('Organization type not specified')
    } else if (!opportunity.organization_types.includes(project.organization_type)) {
      issues.push(`Requires ${opportunity.organization_types.join(' or ')} organizations`)
    }
  }
  
  // Check project type alignment
  if (opportunity.project_types && !opportunity.project_types.includes(project.project_type)) {
    issues.push(`Focuses on ${opportunity.project_types.join(', ')} projects`)
  }
  
  // Check funding alignment
  if (project.funding_needed && opportunity.amount_max && project.funding_needed > opportunity.amount_max) {
    issues.push(`Request ($${project.funding_needed.toLocaleString()}) exceeds maximum ($${opportunity.amount_max.toLocaleString()})`)
  }
  
  // Only mention strengths if score is decent
  if (fitScore >= 60) {
    if (project.funding_needed && opportunity.amount_max && project.funding_needed <= opportunity.amount_max) {
      reasons.push(`Funding request fits within available amount`)
    }
    if (opportunity.project_types?.includes(project.project_type)) {
      reasons.push(`Project type aligns with opportunity focus`)
    }
  }
  
  // Be honest about low scores
  if (fitScore < 40) {
    return `Limited alignment: ${issues.join(', ')}`
  } else if (fitScore < 60) {
    const allPoints = [...issues, ...reasons]
    return allPoints.length > 0 ? allPoints.join('. ') : 'Moderate alignment with some gaps'
  }
  
  return reasons.length > 0 ? reasons.join('. ') : 'Good alignment on key criteria'
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
      .maybeSingle()
    
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

// Enhanced User Context Function with Comprehensive Data
async function getUserContext(userId) {
  try {
    // Get all user data in parallel for better performance
    const [
      profileResult,
      projectsResult,
      donorsResult,
      donationsResult,
      campaignsResult,
      applicationsResult
    ] = await Promise.allSettled([
      supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('projects').select('*').eq('user_id', userId),
      supabase.from('donors').select('*').eq('user_id', userId).limit(10),
      supabase.from('donations').select(`
        *,
        donor:donors(name, donor_type),
        project:projects(name)
      `).eq('user_id', userId).order('donation_date', { ascending: false }).limit(20),
      supabase.from('crowdfunding_campaigns').select(`
        *,
        project:projects(name)
      `).eq('user_id', userId),
      supabase.from('application_submissions').select(`
        *,
        project:projects(name),
        opportunity:opportunities(title, sponsor)
      `).eq('user_id', userId).order('submission_date', { ascending: false })
    ])

    // Safely extract data from results with proper null handling
    const profile = profileResult.status === 'fulfilled' ? profileResult.value.data || null : null
    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value.data || [] : []
    const donors = donorsResult.status === 'fulfilled' ? donorsResult.value.data || [] : []
    const donations = donationsResult.status === 'fulfilled' ? donationsResult.value.data || [] : []
    const campaigns = campaignsResult.status === 'fulfilled' ? campaignsResult.value.data || [] : []
    const applications = applicationsResult.status === 'fulfilled' ? applicationsResult.value.data || [] : []

    // Calculate comprehensive funding statistics
    const fundingStats = {
      totalRaised: donations.reduce((sum, d) => sum + (d.amount || 0), 0),
      totalDonors: donors.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalCampaignGoal: campaigns.reduce((sum, c) => sum + (c.goal_amount || 0), 0),
      totalCampaignRaised: campaigns.reduce((sum, c) => sum + (c.raised_amount || 0), 0),
      
      // Application statistics
      totalApplications: applications.length,
      pendingApplications: applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length,
      approvedApplications: applications.filter(a => a.status === 'approved').length,
      totalRequested: applications.reduce((sum, a) => sum + (a.requested_amount || 0), 0),
      totalAwarded: applications.reduce((sum, a) => sum + (a.award_amount || 0), 0),
      
      // Recent activity
      recentDonations: donations.slice(0, 5),
      recentApplications: applications.slice(0, 5),
      
      // Funding gap analysis - with null checks
      totalProjectNeeds: (projects || []).filter(p => p && typeof p === 'object').reduce((sum, p) => sum + (p.funding_needed || p.total_project_budget || p.funding_request_amount || 0), 0),
      totalSecured: (donations || []).reduce((sum, d) => sum + (d.amount || 0), 0) + 
                   (campaigns || []).reduce((sum, c) => sum + (c.raised_amount || 0), 0) +
                   (applications || []).filter(a => a.status === 'approved').reduce((sum, a) => sum + (a.award_amount || 0), 0),
    }

    // Calculate remaining funding gap
    fundingStats.fundingGap = Math.max(0, fundingStats.totalProjectNeeds - fundingStats.totalSecured)
    fundingStats.fundingProgress = fundingStats.totalProjectNeeds > 0 ? 
      (fundingStats.totalSecured / fundingStats.totalProjectNeeds * 100) : 0

    return { 
      profile,
      projects,
      donors,
      donations,
      campaigns,
      applications,
      fundingStats,
      summary: {
        totalProjects: projects.length,
        totalFundingNeeded: fundingStats.totalProjectNeeds,
        totalSecured: fundingStats.totalSecured,
        fundingGap: fundingStats.fundingGap,
        fundingProgress: Math.round(fundingStats.fundingProgress),
        diversificationScore: calculateDiversificationScore(donations, campaigns, applications)
      }
    }
  } catch (error) {
    console.error('Error getting enhanced user context:', error)
    return { 
      profile: {}, 
      projects: [],
      donors: [],
      donations: [],
      campaigns: [],
      applications: [],
      fundingStats: {},
      summary: {}
    }
  }
}

// Helper function to calculate funding diversification score
function calculateDiversificationScore(donations, campaigns, applications) {
  const sources = []
  
  if (donations.length > 0) sources.push('individual_donations')
  if (campaigns.length > 0) sources.push('crowdfunding')
  if (applications.filter(a => a.status === 'approved').length > 0) sources.push('grants')
  
  // Score based on diversity: 0-100
  const diversityPoints = sources.length * 30 // Max 90 for 3 sources
  const volumeBonus = Math.min(10, donations.length + campaigns.length + applications.length) // Max 10
  
  return Math.min(100, diversityPoints + volumeBonus)
}

// Calculate real progress percentages based on user activity
async function calculateGoalProgress(userId, goalType, supabaseClient) {
  try {
    switch (goalType) {
      case 'opportunity_discovery':
        // Base progress on opportunities discovered vs weekly target (5 per week)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const { count: weeklyOpps } = await supabaseClient
          .from('opportunities')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString())
        
        const targetPerWeek = 5
        const discoveryProgress = Math.min(100, Math.round((weeklyOpps / targetPerWeek) * 100))
        return discoveryProgress

      case 'deadline_management':
        // Base progress on applications with deadlines being tracked
        const { data: applications } = await supabaseClient
          .from('application_submissions')
          .select('*, opportunities(deadline_date)')
          .eq('user_id', userId)
        
        if (!applications || applications.length === 0) return 0
        
        const appsWithDeadlines = applications.filter(app => app.opportunities?.deadline_date)
        const deadlineProgress = Math.round((appsWithDeadlines.length / applications.length) * 100)
        return deadlineProgress

      case 'application_tracking':
        // Base progress on applications submitted vs projects that need funding
        const { data: projects } = await supabaseClient
          .from('projects')
          .select('*')
          .eq('user_id', userId)
        
        const { count: appCount } = await supabaseClient
          .from('application_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
        
        if (!projects || projects.length === 0) return 0
        
        // Calculate based on applications per project (target: 2 applications per project)
        const targetAppsPerProject = 2
        const targetTotal = projects.length * targetAppsPerProject
        const trackingProgress = Math.min(100, Math.round((appCount / targetTotal) * 100))
        return trackingProgress

      default:
        return 0
    }
  } catch (error) {
    console.error('Error calculating goal progress:', error)
    return 0
  }
}

async function createInitialGoals(userId, supabaseClient) {
  // Calculate real progress for each goal type
  const [discoveryProgress, deadlineProgress, trackingProgress] = await Promise.all([
    calculateGoalProgress(userId, 'opportunity_discovery', supabaseClient),
    calculateGoalProgress(userId, 'deadline_management', supabaseClient),
    calculateGoalProgress(userId, 'application_tracking', supabaseClient)
  ])

  const goals = [
    {
      user_id: userId,
      description: 'Discover and analyze funding opportunities',
      type: 'opportunity_discovery',
      priority: 8,
      status: 'active',
      progress: discoveryProgress,
      created_at: new Date().toISOString()
    },
    {
      user_id: userId,
      description: 'Monitor application deadlines',
      type: 'deadline_management',
      priority: 9,
      status: 'active',
      progress: deadlineProgress,
      created_at: new Date().toISOString()
    },
    {
      user_id: userId,
      description: 'Track funding application status',
      type: 'application_tracking',
      priority: 7,
      status: 'active',
      progress: trackingProgress,
      created_at: new Date().toISOString()
    },
    {
      user_id: userId,
      description: 'Optimize funding portfolio diversification',
      type: 'portfolio_optimization',
      priority: 6,
      status: 'active',
      progress: 15,
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

// Direct Serper API search function (no HTTP calls)
async function searchWithSerperAPIDirect(query, projectType, organizationType) {
  if (!process.env.SERPER_API_KEY) {
    console.warn('⚠️ SERPER_API_KEY not found - web search disabled')
    return []
  }
  
  try {
    console.log('🔍 Searching Serper API for:', query)
    
    // Build enhanced search query
    let searchTerms = query
    if (projectType && projectType !== 'unknown') {
      searchTerms += ' ' + projectType.replace(/_/g, ' ')
    }
    if (organizationType && organizationType !== 'unknown') {
      searchTerms += ' ' + organizationType
    }
    searchTerms += ' grants funding opportunities'
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchTerms,
        num: 15
      })
    })
    
    if (!response.ok) {
      throw new Error('Serper API responded with status: ' + response.status)
    }
    
    const data = await response.json()
    console.log('📊 Serper API returned results:', data.organic?.length || 0)
    
    if (data.organic && data.organic.length > 0) {
      return data.organic.map(item => ({
        title: item.title || 'No title',
        url: item.link || '',
        description: item.snippet || 'No description available',
        source: 'web_search',
        search_engine: 'google',
        position: item.position || 0,
        domain: item.displayLink || '',
        relevance_score: 0.8
      })).filter(opp => {
        // Only return opportunities with valid URLs
        try {
          if (!opp.url || opp.url === '') return false
          new URL(opp.url) // Test if URL is valid
          return true
        } catch {
          return false
        }
      })
    }
    
    return []
  } catch (error) {
    console.error('❌ Serper API search failed:', error.message)
    return []
  }
}

// Direct database search function (no HTTP calls)
async function searchDatabaseDirect(query, projectType, organizationType) {
  try {
    console.log('🗄️ Searching database for:', query)
    
    // Use the existing supabase client from the main handler
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const searchTerms = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(term => term.length > 2)
    
    let dbQuery = supabase.from('opportunities').select('*')
    
    if (searchTerms.length > 0) {
      const searchConditions = []
      searchTerms.forEach(term => {
        searchConditions.push('title.ilike.%' + term + '%')
        searchConditions.push('description.ilike.%' + term + '%')
        searchConditions.push('sponsor.ilike.%' + term + '%')
      })
      dbQuery = dbQuery.or(searchConditions.join(','))
    }
    
    const { data: opportunities, error } = await dbQuery
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error('Database search error:', error)
      return []
    }
    
    console.log('📊 Database search found:', opportunities?.length || 0)
    return opportunities || []
    
  } catch (error) {
    console.error('❌ Database search failed:', error)
    return []
  }
}

// Save web search results to opportunities table
async function saveWebResultsToDatabase(webResults, searchQuery, userId) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Convert web results to database format
    const opportunitiesToSave = webResults.map(result => ({
      title: result.title || 'Untitled Opportunity',
      description: result.description || 'No description available',
      source_url: result.url,
      sponsor: result.domain || 'Web Search',
      source: 'web_search_serper',
      discovered_via: `Web search: "${searchQuery}"`,
      discovered_by_user: userId,
      search_engine: result.search_engine || 'google',
      search_position: result.position || null,
      relevance_score: result.relevance_score || 0.8,
      funding_type: 'Unknown', // Will be analyzed later
      organization_types: ['General'], // Default, can be updated
      geographic_scope: 'Unknown',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Add metadata for tracking
      metadata: {
        search_query: searchQuery,
        discovered_at: new Date().toISOString(),
        search_method: 'serper_api',
        needs_analysis: true // Flag for later AI analysis
      }
    }))
    
    console.log(`📝 Prepared ${opportunitiesToSave.length} opportunities for database insertion`)
    
    // Check for duplicates before inserting (based on source_url)
    const existingUrls = await supabase
      .from('opportunities')
      .select('source_url')
      .in('source_url', opportunitiesToSave.map(o => o.source_url))
    
    const existingUrlSet = new Set(existingUrls.data?.map(o => o.source_url) || [])
    const newOpportunities = opportunitiesToSave.filter(o => !existingUrlSet.has(o.source_url))
    
    if (newOpportunities.length === 0) {
      console.log('ℹ️ All web results already exist in database, skipping insert')
      return { inserted: 0, skipped: opportunitiesToSave.length }
    }
    
    console.log(`📊 Inserting ${newOpportunities.length} new opportunities (${opportunitiesToSave.length - newOpportunities.length} duplicates skipped)`)
    
    // Insert new opportunities in batches (Supabase has limits)
    const batchSize = 100
    let totalInserted = 0
    
    for (let i = 0; i < newOpportunities.length; i += batchSize) {
      const batch = newOpportunities.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('opportunities')
        .insert(batch)
        .select('id')
      
      if (error) {
        console.error(`❌ Failed to insert batch ${i / batchSize + 1}:`, error)
        throw error
      }
      
      totalInserted += data?.length || 0
      console.log(`✅ Inserted batch ${i / batchSize + 1}: ${data?.length || 0} opportunities`)
    }
    
    console.log(`🎉 Successfully saved ${totalInserted} new opportunities to database`)
    
    return {
      inserted: totalInserted,
      skipped: existingUrlSet.size,
      total_processed: opportunitiesToSave.length
    }
    
  } catch (error) {
    console.error('❌ Error saving web results to database:', error)
    throw error
  }
}