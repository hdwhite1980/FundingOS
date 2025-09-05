// pages/api/ai/agent/[...action].js
// Production-optimized AI agent with comprehensive user context and opportunity analysis

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

          console.log(`Processing chat message: "${message}"`)
          console.log(`Context: ${projects?.length || 0} projects, ${opportunities?.length || 0} opportunities`)

          // Get enhanced user context from database
          const userContext = await getUserContext(userId)
          
          // Analyze message intent
          const messageIntent = analyzeMessageIntent(message)
          console.log('Message intent:', messageIntent)
          
          // Handle opportunity analysis requests
          if (messageIntent.includes('analyze_opportunities') && opportunities?.length > 0 && projects?.length > 0) {
            console.log('Performing comprehensive opportunity analysis...')
            
            // Trigger comprehensive opportunity analysis
            const analysis = await analyzeAllOpportunities(userId, projects, opportunities, userContext.profile)
            
            // Create decisions for top opportunities
            if (analysis.topMatches.length > 0) {
              await createOpportunityDecisions(userId, analysis.topMatches)
              console.log(`Created ${analysis.topMatches.length} opportunity decisions`)
            }
            
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
          
          // Enhanced context for regular chat
          const enhancedContext = {
            userId,
            userContext,
            projects: projects || [],
            opportunities: opportunities || [],
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

// NEW: Enhanced response generator with better opportunity formatting
async function generateEnhancedAgentResponse(message, context) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI service not configured')
  }
  
  const { userContext, projects, opportunities, opportunityDetails } = context
  const { profile, fundingStats, summary } = userContext
  
  // Format projects clearly
  const projectSummary = projects.length > 0 ? 
    projects.map(p => `• "${p.name}" - ${p.project_type?.replace('_', ' ')} project needing $${p.funding_needed?.toLocaleString() || 'TBD'} in ${p.location || 'location TBD'}`).join('\n') : 
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

  const prompt = `You are an AI funding strategist providing specific, actionable advice.

USER MESSAGE: "${message}"

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

Respond with specific, personalized advice based on their actual data.`

  try {
    // Detect simple data queries for direct answers
    const isSimpleQuery = detectSimpleDataQuery(message)
    console.log(`Simple query detected: ${isSimpleQuery} for message: "${message}"`)
    
    let prompt, maxTokens = 1200

    if (isSimpleQuery) {
      maxTokens = 300 // Shorter responses for simple queries
      prompt = `Answer this specific question directly and concisely using the user's actual data:

QUESTION: "${message}"

FUNDING DATA:
- Individual donations: ${fundingStats?.totalRaised?.toLocaleString() || '0'} from ${fundingStats?.totalDonors || 0} donors
- Grant funding awarded: ${fundingStats?.totalAwarded?.toLocaleString() || '0'} from ${fundingStats?.approvedApplications || 0} approved applications  
- Crowdfunding raised: ${fundingStats?.totalCampaignRaised?.toLocaleString() || '0'} from ${fundingStats?.activeCampaigns || 0} active campaigns
- Total funding secured: ${summary?.totalSecured?.toLocaleString() || '0'}
- Total funding needed: ${summary?.totalFundingNeeded?.toLocaleString() || '0'}
- Funding gap: ${summary?.fundingGap?.toLocaleString() || '0'}

Give a direct, factual answer. Be brief and specific. Do not provide strategy advice unless asked.`
    } else {
      prompt = `You are an AI funding strategist providing specific, actionable advice.

USER MESSAGE: "${message}"

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

Respond with specific, personalized advice based on their actual data.`
    }

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
            content: isSimpleQuery ? 
              'You are a data assistant. Provide direct, factual answers using only the data provided. Be concise and specific. Do not give advice unless requested.' :
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

// Enhanced AI Response Function with Data-Driven Context
async function generateAgentResponse(message, context) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('AI service not configured')
  }
  
  const { userContext, projects, opportunities } = context
  const { profile, fundingStats, summary, donations, campaigns, applications } = userContext
  
  // Build comprehensive context string
  const projectContext = projects.length > 0 ? 
    `Active Projects: ${projects.map(p => `"${p.name}" (${p.project_type}, ${p.funding_needed?.toLocaleString()} needed)`).join(', ')}` : 
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
        model: 'gpt-4',
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
    // Donation queries
    /how much.*donations?/,
    /total.*donations?/,
    /donation.*amount/,
    /how many.*donors?/,
    
    // Campaign queries  
    /how much.*raised/,
    /campaign.*raised/,
    /crowdfunding.*amount/,
    
    // Grant queries
    /how much.*grants?/,
    /grant.*funding/,
    /total.*awarded/,
    
    // General funding queries
    /how much.*funding/,
    /total.*secured/,
    /funding.*gap/,
    /how much.*need/,
    
    // Status queries
    /funding.*status/,
    /current.*funding/,
    /progress.*funding/
  ]
  
  return simpleQueries.some(pattern => pattern.test(lowerMessage))
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
  if (lowerMessage.includes('status') || lowerMessage.includes('progress') || lowerMessage.includes('portfolio')) {
    intents.push('check_status')
  }
  if (lowerMessage.includes('diversif') || lowerMessage.includes('balance') || lowerMessage.includes('spread')) {
    intents.push('diversification_analysis')
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
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
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

    // Safely extract data from results
    const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : {}
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
      
      // Funding gap analysis
      totalProjectNeeds: projects.reduce((sum, p) => sum + (p.funding_needed || 0), 0),
      totalSecured: donations.reduce((sum, d) => sum + (d.amount || 0), 0) + 
                   campaigns.reduce((sum, c) => sum + (c.raised_amount || 0), 0) +
                   applications.filter(a => a.status === 'approved').reduce((sum, a) => sum + (a.award_amount || 0), 0),
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