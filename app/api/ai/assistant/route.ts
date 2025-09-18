import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'
import { buildOrgContext, classifyAssistantIntent, generateAssistantResponse, getCachedOrgContext } from '../../../../lib/ai/contextBuilder'
import { summarizeSessionIfNeeded, getSessionContextSummary } from '../../../../lib/ai/conversationSummarizer'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

// Phase 1: Hybrid approach. We do lightweight heuristic routing; optionally call LLM for refinement.
// Request body: { userId, message, mode?, useLLM? }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, message, useLLM = false, mode = 'chat', sessionId } = body || {}

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

  // Ensure session id (needed for summarization) early
  const activeSessionId = await ensureSession(userId, sessionId)

  // Attempt summarization (fire-and-forget style; we don't block on failure)
  try { await summarizeSessionIfNeeded(activeSessionId, userId, { useLLM: useLLM }) } catch {}

  // Conversation rolling summary + recent tail (for optional LLM refinement)
  let convoSummary: any = null
  try { convoSummary = await getSessionContextSummary(activeSessionId, userId) } catch {}

  // Build or fetch cached org context (separate from convo summary)
  const { context, cached } = await getCachedOrgContext(userId, { ttlMs: 10 * 60 * 1000 })

    // Basic heuristic intent classification
    const intent = classifyAssistantIntent(message)

    // Generate structured base answer (fast path)
    const baseAnswer = generateAssistantResponse(intent, context, message)

  // Persist user message + base intent (session already ensured)
    await logConversationTurn(activeSessionId, userId, 'user', message)

    if (!useLLM) {
      await logConversationTurn(activeSessionId, userId, 'assistant', baseAnswer)
      return NextResponse.json({
        data: {
          mode,
          intent,
          message: baseAnswer,
          usedLLM: false,
          contextMeta: context.meta,
          sessionId: activeSessionId,
          cachedContext: cached,
          convoSummary
        }
      })
    }

    // LLM refinement path: Provide context summary and user question for richer answer.
    const systemPrompt = `You are FundingOS Assistant, a funding strategy expert. Be concise, practical, structured. If user asks for something you cannot see in context, state what's missing and suggest next steps.`

    // Summarize context minimally (avoid huge token usage Phase 1)
    const compactContext = {
      org: {
        name: context.profile?.organization_name,
        type: context.profile?.organization_type,
        projects_count: context.projects.length,
        applications_count: context.applications.length,
        donors_count: context.donors.length,
        investors_count: context.investors.length,
        award_rate: context.funding_summary.award_rate
      },
      top_project: context.projects[0]?.name,
      top_opportunity: (context.opportunities[0]?.title),
      recent_application_status: context.applications[0]?.status
    }

  const userPrompt = `User Message: ${message}\nHeuristic Intent: ${intent}\nFast Draft Answer: ${baseAnswer}\n\nConversation Summary (may be null): ${convoSummary?.summary || 'None yet'}\nRecent Turns (most recent last):\n${(convoSummary?.recentTurns||[]).map(t=>`- ${t.role}: ${t.content}`).join('\n')}\n\nOrg Context Snapshot JSON:\n${JSON.stringify(compactContext, null, 2)}\n\nRefine the draft answer if needed. Provide funding-relevant insight. If suggesting actions, bullet them. Avoid repeating already summarized info unless directly relevant.`

    let refined = baseAnswer
    try {
      const llmResp: any = await aiProviderService.generateCompletion('conversation', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], { maxTokens: 600, temperature: 0.4 })
      if (llmResp && typeof llmResp.content === 'string') {
        refined = llmResp.content.trim() || baseAnswer
      }
    } catch (err: any) {
      console.warn('LLM refinement failed, returning base answer', err?.message)
    }

    await logConversationTurn(activeSessionId, userId, 'assistant', refined)
    return NextResponse.json({
      data: {
        mode,
        intent,
        message: refined,
        base: baseAnswer,
        usedLLM: true,
        contextMeta: context.meta,
        sessionId: activeSessionId,
        cachedContext: cached,
        convoSummary
      }
    })
  } catch (error:any) {
    console.error('Assistant API error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

async function ensureSession(userId: string, provided?: string) {
  if (provided) return provided
  const { data: newSession, error } = await supabaseAdmin
    .from('assistant_sessions')
    .insert([{ user_id: userId }])
    .select('id')
    .single()
  if (error) throw new Error('Failed to create session')
  return newSession.id
}

async function logConversationTurn(sessionId: string, userId: string, role: string, content: string) {
  try {
    await supabaseAdmin
      .from('assistant_conversations')
      .insert([{ session_id: sessionId, user_id: userId, role, content }])
  } catch (e:any) {
    console.warn('Failed to log conversation turn', e.message)
  }
}
