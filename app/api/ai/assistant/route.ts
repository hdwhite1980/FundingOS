import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'
import { buildOrgContext, classifyAssistantIntent, generateAssistantResponse, getCachedOrgContext } from '../../../../lib/ai/contextBuilder'
import { summarizeSessionIfNeeded, getSessionContextSummary } from '../../../../lib/ai/conversationSummarizer'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, message, useLLM = false, mode = 'chat', sessionId, context: providedContext } = body || {}

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    console.log(`Assistant Request: User ${userId}, Message: "${message}", LLM: ${useLLM}`)

    // Ensure session id (needed for summarization) early
    const activeSessionId = await ensureSession(userId, sessionId)

    // Attempt summarization (fire-and-forget style; we don't block on failure)
    try { 
      await summarizeSessionIfNeeded(activeSessionId, userId, { useLLM: useLLM }) 
    } catch (e) {
      console.warn('Summarization failed:', e.message)
    }

    // Conversation rolling summary + recent tail (for optional LLM refinement)
    let convoSummary: any = null
    try { 
      convoSummary = await getSessionContextSummary(activeSessionId, userId) 
    } catch (e) {
      console.warn('Conversation summary failed:', e.message)
    }

    // Build or fetch cached org context (separate from convo summary)
    let context
    let cached = false
    try {
      const contextResult = await getCachedOrgContext(userId, { ttlMs: 10 * 60 * 1000 })
      context = contextResult.context
      cached = contextResult.cached
      console.log(`Context loaded: ${context.projects?.length || 0} projects, ${context.applications?.length || 0} applications, EIN: ${context.profile?.ein || context.profile?.tax_id || 'None'}`)
    } catch (error) {
      console.error('Context building failed:', error)
      // Provide minimal fallback context
      context = {
        profile: {},
        projects: [],
        applications: [],
        opportunities: [],
        campaigns: [],
        funding_summary: { total_requested: 0, applications_count: 0, award_rate: 0 },
        meta: { updated_at: new Date().toISOString(), user_id: userId }
      }
    }

    // Basic heuristic intent classification
    const intent = classifyAssistantIntent(message) as string
    console.log(`Classified intent: ${intent}`)

    // Persist user message early
    await logConversationTurn(activeSessionId, userId, 'user', message)

    // Check if we should use LLM
    const shouldUseLLM = useLLM || intent === 'funding_strategy_advice'

    // COMPLETELY SEPARATE PATHS - NO MIXING
    if (intent === 'funding_strategy_advice') {
      // FUNDING STRATEGY: LLM ONLY - no base generation at all
      console.log('🎯 Funding strategy detected - using LLM only')
      return await handleFundingStrategyWithLLM(context, message, intent, activeSessionId, userId, convoSummary, cached)
    }

    if (!shouldUseLLM) {
      // NON-LLM PATH: Use integrated generateAssistantResponse
      console.log(`🎯 Processing intent '${intent}' with integrated response system`)
      
      const result = await generateAssistantResponse(intent, context, message, userId)
      
      const responseMessage = result.success ? result.response : "I'm having trouble accessing your information right now. Please try again in a moment."
      
      await logConversationTurn(activeSessionId, userId, 'assistant', responseMessage || 'Error generating response')
      
      console.log(`✅ Fast response returned (${responseMessage?.length || 0} chars)`)
      
      return NextResponse.json({
        success: result.success,
        message: responseMessage,
        metadata: result.metadata,
        data: {
          mode,
          intent,
          message: responseMessage,
          usedLLM: false,
          contextMeta: context.meta,
          sessionId: activeSessionId,
          cachedContext: cached,
          convoSummary,
          debugInfo: {
            projectsCount: context.projects?.length || 0,
            applicationsCount: context.applications?.length || 0,
            campaignsCount: context.campaigns?.length || 0,
            hasEIN: !!(context.profile?.ein || context.profile?.tax_id),
            orgName: context.profile?.organization_name || 'Unknown'
          }
        }
      })
    }

    // LLM ENHANCEMENT PATH: Direct LLM response for non-funding strategy intents
    console.log('🔄 Using LLM for intent:', intent)
    
    const systemPrompt = `You are the WALI-OS Funding Assistant, an expert in grant strategy and funding discovery. You help users with comprehensive funding strategies, grant applications, and organizational data.

IMPORTANT: The user has real data in the system. Use the specific information provided rather than giving generic responses.

Key principles:
- Be concise and actionable
- Use specific data when available (EIN numbers, project names, deadlines, amounts)
- If data is missing, tell them exactly what's missing
- Focus on funding strategy and grant applications
- Use formatting for visual clarity but avoid excessive emojis`

    // Build enhanced context for LLM - only for non-funding strategy intents
    const contextSummary = {
      organization: {
        name: context.profile?.organization_name || 'Not specified',
        type: context.profile?.organization_type || 'Not specified',
        ein: context.profile?.ein || context.profile?.tax_id || 'Not on file',
        location: context.profile?.city || 'Not specified'
      },
      projects: {
        count: context.projects?.length || 0,
        recent: context.projects?.slice(0, 3).map(p => ({
          name: p.name || p.title,
          status: p.status,
          budget: p.total_project_budget || p.funding_needed
        })) || []
      },
      applications: {
        count: context.applications?.length || 0,
        total_requested: context.funding_summary?.total_requested || 0,
        by_status: context.applications?.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1
          return acc
        }, {}) || {},
        recent: context.applications?.slice(0, 3).map(a => ({
          title: a.title,
          status: a.status,
          amount: a.amount_requested,
          deadline: a.deadline
        })) || []
      },
      campaigns: {
        count: context.campaigns?.length || 0,
        total_raised: context.funding_summary?.total_campaign_raised || 0,
      }
    }

    const userPrompt = `User Query: "${message}"

Intent Classification: ${intent}

Conversation Context: ${convoSummary?.summary || 'No previous conversation'}

Real User Data:
${JSON.stringify(contextSummary, null, 2)}

Please provide a response using the specific data shown above. Reference actual project names, amounts, deadlines, and organization details when available.`

    let finalResponse = "I'm having trouble generating a response right now."
    let llmError: string | null = null
    
    try {
      console.log('Calling LLM for response generation...')
      
      const llmResp: any = await aiProviderService.generateCompletion('conversation', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 800, temperature: 0.3 })
      
      if (llmResp && typeof llmResp.content === 'string' && llmResp.content.trim()) {
        finalResponse = llmResp.content.trim()
        console.log(`LLM generated response (${finalResponse.length} chars)`)
      } else {
        llmError = 'No valid response from AI provider'
        console.warn('LLM returned empty/invalid response')
        // Fallback to base generation if LLM fails
        try {
          finalResponse = await generateAssistantResponse(intent, context, message, userId)
        } catch (fallbackError) {
          finalResponse = "I'm having trouble accessing your data right now. Please try again in a moment."
        }
      }
    } catch (err: any) {
      console.error('LLM generation failed:', err?.message)
      llmError = err?.message || 'AI provider error'
      // Fallback to base generation if LLM fails
      try {
        finalResponse = await generateAssistantResponse(intent, context, message, userId)
        finalResponse += `\n\n*Note: AI enhancement temporarily unavailable.*`
      } catch (fallbackError) {
        finalResponse = "I'm having trouble accessing your data right now. Please try again in a moment."
      }
    }

    await logConversationTurn(activeSessionId, userId, 'assistant', finalResponse)
    
    console.log(`Enhanced response returned (${finalResponse.length} chars)`)
    
    return NextResponse.json({
      data: {
        mode,
        intent,
        message: finalResponse,
        usedLLM: true,
        llmError,
        contextMeta: context.meta,
        sessionId: activeSessionId,
        cachedContext: cached,
        convoSummary,
        apiIntegration: 'passive',
        debugInfo: {
          projectsCount: context.projects?.length || 0,
          applicationsCount: context.applications?.length || 0,
          campaignsCount: context.campaigns?.length || 0,
          hasEIN: !!(context.profile?.ein || context.profile?.tax_id),
          orgName: context.profile?.organization_name || 'Unknown',
          fundingStrategy: false
        }
      }
    })

  } catch (error: any) {
    console.error('Request failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// SEPARATE FUNCTION: Handle funding strategy with LLM only
async function handleFundingStrategyWithLLM(context, message, intent, activeSessionId, userId, convoSummary, cached) {
  const systemPrompt = `You are the WALI-OS Funding Assistant, an expert in grant strategy and funding discovery. You help users with comprehensive funding strategies, grant applications, and organizational data.

IMPORTANT: The user has real data in the system. Use the specific information provided rather than giving generic responses.

For funding strategy requests:
- Provide specific, actionable recommendations
- Reference actual project data when available  
- Suggest concrete next steps
- Include deadlines and amounts when known
- Focus on matching user profile to actual opportunities

Key principles:
- Be concise and actionable
- Use specific data when available (EIN numbers, project names, deadlines, amounts)
- If data is missing, tell them exactly what's missing
- Focus on funding strategy and grant applications
- Use formatting for visual clarity but avoid excessive emojis`

  const contextSummary = {
    request_type: 'funding_strategy',
    organization: {
      name: context.profile?.organization_name || 'Not specified',
      type: context.profile?.organization_type || 'Not specified', 
      ein: context.profile?.ein || context.profile?.tax_id || 'Not on file',
      location: `${context.profile?.city || ''} ${context.profile?.state || ''}`.trim() || 'Not specified',
      certifications: {
        minority_owned: context.profile?.minority_owned || false,
        woman_owned: context.profile?.woman_owned || false,
        veteran_owned: context.profile?.veteran_owned || false,
        small_business: context.profile?.small_business || false
      }
    },
    projects: {
      count: context.projects?.length || 0,
      total_funding_needed: context.projects?.reduce((sum, p) => {
        const amount = p.funding_request_amount || p.funding_needed || p.total_project_budget || 0
        return sum + parseFloat(amount || 0)
      }, 0) || 0,
      active_projects: context.projects?.filter(p => ['active', 'in_progress', 'draft'].includes(p.status)).map(p => ({
        name: p.name,
        type: p.project_type,
        industry: p.industry,
        funding_needed: p.funding_request_amount || p.funding_needed || p.total_project_budget,
        description: p.description?.substring(0, 200)
      })) || []
    },
    funding_history: {
      applications_count: context.applications?.length || 0,
      total_requested: context.funding_summary?.total_requested || 0,
      campaigns_count: context.campaigns?.length || 0,
      total_campaign_raised: context.funding_summary?.total_campaign_raised || 0
    }
  }

  const userPrompt = `The user is asking for funding strategy advice: "${message}"

This is their organization and project data:
${JSON.stringify(contextSummary, null, 2)}

Please provide a comprehensive funding strategy response that:
1. Analyzes their current projects and funding needs
2. Provides specific grant recommendations based on their profile
3. Suggests concrete next steps  
4. References their actual data (project names, amounts, EIN, etc.)
5. Gives actionable advice they can implement immediately

Do not generate generic advice - use their specific project data and organizational profile.`

  let finalResponse = "I'm having trouble generating funding strategy recommendations right now."
  let llmError: string | null = null

  try {
    console.log('🤖 Calling LLM for funding strategy...')
    
    const llmResp = await aiProviderService.generateCompletion('conversation', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], { maxTokens: 1200, temperature: 0.3 })
    
    if (llmResp && typeof llmResp.content === 'string' && llmResp.content.trim()) {
      finalResponse = llmResp.content.trim()
      console.log(`✅ Funding strategy response generated (${finalResponse.length} chars)`)
    } else {
      llmError = 'No valid response from AI provider'
      console.warn('⚠️ LLM returned empty/invalid response')
      finalResponse = "I'm having trouble generating funding strategy recommendations. Please try again in a moment."
    }
  } catch (err) {
    console.error('❌ LLM funding strategy failed:', err?.message)
    llmError = err?.message || 'AI provider error'
    finalResponse = "I'm having trouble generating funding strategy recommendations right now. Please try again in a moment."
  }

  await logConversationTurn(activeSessionId, userId, 'assistant', finalResponse)
  
  return NextResponse.json({
    data: {
      mode: 'chat',
      intent,
      message: finalResponse,
      usedLLM: true,
      llmError,
      contextMeta: context.meta,
      sessionId: activeSessionId,
      cachedContext: cached,
      convoSummary,
      apiIntegration: 'active',
      debugInfo: {
        projectsCount: context.projects?.length || 0,
        applicationsCount: context.applications?.length || 0,
        campaignsCount: context.campaigns?.length || 0,
        hasEIN: !!(context.profile?.ein || context.profile?.tax_id),
        orgName: context.profile?.organization_name || 'Unknown',
        fundingStrategy: true
      }
    }
  })
}

async function ensureSession(userId: string, provided?: string) {
  if (provided) return provided
  
  try {
    const { data: newSession, error } = await supabaseAdmin
      .from('assistant_sessions')
      .insert([{ user_id: userId }])
      .select('id')
      .single()
    if (error) throw new Error('Failed to create session: ' + error.message)
    return newSession.id
  } catch (error: any) {
    console.warn('assistant_sessions table may not exist, using fallback session ID')
    // Generate a temporary session ID if table doesn't exist
    return `temp-${userId}-${Date.now()}`
  }
}

async function logConversationTurn(sessionId: string, userId: string, role: string, content: string) {
  try {
    await supabaseAdmin
      .from('assistant_conversations')
      .insert([{ session_id: sessionId, user_id: userId, role, content }])
  } catch (e: any) {
    console.warn('Failed to log conversation turn (table may not exist):', e.message)
  }
}