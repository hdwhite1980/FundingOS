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

    console.log(`🤖 Assistant Request: User ${userId}, Message: "${message}", LLM: ${useLLM}`)

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
      console.log(`📊 Context loaded: ${context.projects?.length || 0} projects, ${context.applications?.length || 0} applications, EIN: ${context.profile?.ein || context.profile?.tax_id || 'None'}`)
    } catch (error) {
      console.error('Context building failed:', error)
      // Provide minimal fallback context
      context = {
        profile: {},
        projects: [],
        applications: [],
        opportunities: [],
        funding_summary: { total_requested: 0, applications_count: 0, award_rate: 0 },
        meta: { updated_at: new Date().toISOString(), user_id: userId }
      }
    }

    // Basic heuristic intent classification
    const intent = classifyAssistantIntent(message)
    console.log(`🎯 Classified intent: ${intent}`)

    // Generate structured base answer using REAL DATA
    let baseAnswer
    try {
      baseAnswer = await generateAssistantResponse(intent, context, message, userId)
      console.log(`💬 Generated response length: ${baseAnswer?.length || 0} chars`)
    } catch (error) {
      console.error('Response generation failed:', error)
      baseAnswer = "I'm having trouble accessing your data right now. Please try again in a moment."
    }

    // Persist user message + base intent (session already ensured)
    await logConversationTurn(activeSessionId, userId, 'user', message)

    if (!useLLM) {
      await logConversationTurn(activeSessionId, userId, 'assistant', baseAnswer)
      
      console.log(`✅ Fast response returned (${baseAnswer.length} chars)`)
      
      return NextResponse.json({
        data: {
          mode,
          intent,
          message: baseAnswer,
          usedLLM: false,
          contextMeta: context.meta,
          sessionId: activeSessionId,
          cachedContext: cached,
          convoSummary,
          debugInfo: {
            projectsCount: context.projects?.length || 0,
            applicationsCount: context.applications?.length || 0,
            hasEIN: !!(context.profile?.ein || context.profile?.tax_id),
            orgName: context.profile?.organization_name || 'Unknown'
          }
        }
      })
    }

    // LLM refinement path: Provide context summary and user question for richer answer.
    const systemPrompt = `You are the WALI-OS Funding Assistant. You help users with grant applications, funding strategy, and organizational data.

IMPORTANT: The user has real data in the system. Use the specific information provided rather than giving generic responses.

Key principles:
- Be concise and actionable
- Use specific data when available (EIN numbers, project names, deadlines, amounts)
- If data is missing, tell them exactly what's missing
- Focus on funding strategy and grant applications
- Use emojis sparingly for visual clarity`

    // Build comprehensive context for LLM
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
          budget: p.budget
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
      opportunities: {
        count: context.opportunities?.length || 0,
        upcoming: context.opportunities?.filter(o => 
          o.deadline && new Date(o.deadline) > new Date()
        ).slice(0, 3).map(o => ({
          title: o.title,
          deadline: o.deadline,
          amount: o.amount_max,
          fit_score: o.fit_score
        })) || []
      }
    }

    const userPrompt = `User Query: "${message}"

Intent Classification: ${intent}

Initial Response Generated: "${baseAnswer}"

Conversation Context: ${convoSummary?.summary || 'No previous conversation'}

Real User Data:
${JSON.stringify(contextSummary, null, 2)}

Please review the initial response and enhance it with the specific data shown above. If the initial response used generic language, replace it with specific information from the user's actual data. Be direct and helpful.`

    let refined = baseAnswer
    let llmError: string | null = null
    
    try {
      console.log('🧠 Calling LLM for refinement...')
      
      const llmResp: any = await aiProviderService.generateCompletion('conversation', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 800, temperature: 0.3 })
      
      if (llmResp && typeof llmResp.content === 'string' && llmResp.content.trim()) {
        refined = llmResp.content.trim()
        console.log(`🎨 LLM refined response (${refined.length} chars)`)
      } else {
        llmError = 'No valid response from AI provider'
        console.warn('⚠️ LLM returned empty/invalid response')
      }
    } catch (err: any) {
      console.error('❌ LLM refinement failed:', err?.message)
      llmError = err?.message || 'AI provider error'
      
      // Enhance the base answer with a note about the AI issue
      refined = `${baseAnswer}\n\n*Note: AI enhancement temporarily unavailable - showing data-based response.*`
    }

    await logConversationTurn(activeSessionId, userId, 'assistant', refined)
    
    console.log(`✅ Enhanced response returned (${refined.length} chars)`)
    
    return NextResponse.json({
      data: {
        mode,
        intent,
        message: refined,
        base: baseAnswer,
        usedLLM: true,
        llmError,
        contextMeta: context.meta,
        sessionId: activeSessionId,
        cachedContext: cached,
        convoSummary,
        debugInfo: {
          projectsCount: context.projects?.length || 0,
          applicationsCount: context.applications?.length || 0,
          hasEIN: !!(context.profile?.ein || context.profile?.tax_id),
          orgName: context.profile?.organization_name || 'Unknown'
        }
      }
    })
  } catch (error: any) {
    console.error('❌ Assistant API error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
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