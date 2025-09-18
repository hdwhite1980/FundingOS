// lib/ai/conversationSummarizer.js
// Phase 1 conversation summarization: roll up older turns once count or tokens exceed thresholds.
// Strategy: When a session exceeds MAX_TURNS_WINDOW (un-summarized), condense oldest block into a summary record.
// Later phases can use embeddings or hierarchical summaries.

import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabaseAdmin'
import aiProviderService from '../aiProviderService'

const MAX_UNSUMMARIZED_TURNS = 24              // trigger if more than this many unsummarized turns
const MIN_TURNS_PER_SUMMARY = 8                // don't summarize tiny sessions
const TARGET_SUMMARY_TOKEN_BUDGET = 220        // approx tokens for summary

export async function summarizeSessionIfNeeded(sessionId, userId, { useLLM = true } = {}) {
  if (!sessionId || !userId) return { skipped: true, reason: 'missing identifiers' }

  // Fetch unsummarized turns ordered oldest first
  const { data: turns, error } = await supabase
    .from('assistant_conversations')
    .select('id, role, content, created_at, summarized')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) return { skipped: true, reason: 'fetch_error' }

  const unsummarized = (turns || []).filter(t => !t.summarized)
  if (unsummarized.length <= MAX_UNSUMMARIZED_TURNS) {
    return { skipped: true, reason: 'below_threshold', unsummarized: unsummarized.length }
  }
  if (unsummarized.length < MIN_TURNS_PER_SUMMARY) {
    return { skipped: true, reason: 'not_enough_for_summary' }
  }

  // Take oldest block leaving last RECENT window intact (keep recency for reply quality)
  const RECENT_PRESERVE = 10
  if (unsummarized.length <= RECENT_PRESERVE + MIN_TURNS_PER_SUMMARY) {
    return { skipped: true, reason: 'not_enough_after_preserve' }
  }
  const toSummarize = unsummarized.slice(0, unsummarized.length - RECENT_PRESERVE)

  const plainTranscript = toSummarize.map(t => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`).join('\n')
  let summaryText = buildHeuristicSummary(plainTranscript)

  if (useLLM) {
    try {
      const prompt = `Condense the following funding assistant conversation into: \n1) Key user objectives \n2) Project/grant context gleaned \n3) Open questions or next steps.\nBe concise. Raw transcript:\n---\n${truncate(plainTranscript, 8000)}\n---` 
      const resp = await aiProviderService.generateCompletion('conversation-summary', [
        { role: 'system', content: 'You summarize funding strategy assistant chats. Output 3 short labeled sections.' },
        { role: 'user', content: prompt }
      ], { maxTokens: 300, temperature: 0.2 })
      if (resp?.content) summaryText = resp.content.trim()
    } catch (e) {
      console.warn('LLM summary failed, using heuristic', e.message)
    }
  }

  // Insert summary record
  const coveredUntil = toSummarize[toSummarize.length - 1].created_at
  const { error: insertErr } = await supabaseAdmin
    .from('assistant_session_summaries')
    .insert([{ session_id: sessionId, user_id: userId, summary_text: summaryText, covered_until: coveredUntil, turns_covered: toSummarize.length }])
  if (insertErr) return { skipped: true, reason: 'insert_failed' }

  // Mark turns as summarized
  const ids = toSummarize.map(t => t.id)
  const { error: updErr } = await supabaseAdmin
    .from('assistant_conversations')
    .update({ summarized: true })
    .in('id', ids)
  if (updErr) console.warn('Failed to flag summarized turns', updErr.message)

  return { summarized: true, turns: toSummarize.length }
}

export async function getSessionContextSummary(sessionId, userId) {
  // Fetch most recent summary (if any)
  const { data: summaries } = await supabase
    .from('assistant_session_summaries')
    .select('id, summary_text, created_at, covered_until')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)

  const latestSummary = summaries?.[0]

  // Fetch recent unsummarized turns (keep last ~12 for recency)
  const { data: recentTurns } = await supabase
    .from('assistant_conversations')
    .select('role, content, created_at, summarized')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(14)

  const recent = (recentTurns || [])
    .filter(t => !t.summarized) // only unsummarized recency
    .sort((a,b) => new Date(a.created_at) - new Date(b.created_at))

  return {
    summary: latestSummary?.summary_text || null,
    recentTurns: recent.map(t => ({ role: t.role, content: t.content }))
  }
}

function buildHeuristicSummary(text) {
  const lines = text.split(/\n+/)
  const userObjectives = []
  const contextFacts = []
  lines.forEach(l => {
    if (/^User:/.test(l)) {
      const content = l.replace(/^User:\s*/, '')
      if (/project|grant|fund|deadline|budget|application/i.test(content)) userObjectives.push(content)
    } else if (/Assistant:/.test(l)) {
      const content = l.replace(/^Assistant:\s*/, '')
      if (/You have|Top opportunity|deadline|budget|categories|applications/i.test(content)) contextFacts.push(content)
    }
  })
  return `Key User Objectives:\n- ${dedupe(userObjectives).slice(0,5).join('\n- ')}\n\nContext Gleaned:\n- ${dedupe(contextFacts).slice(0,5).join('\n- ')}\n\nNext Steps:\n- Clarify outstanding questions in future turns.`
}

function dedupe(arr){
  const seen = new Set(); const out=[]; for(const a of arr){const k=a.toLowerCase(); if(!seen.has(k)){seen.add(k); out.push(a)}} return out
}

function truncate(str, max){ if(!str) return ''; return str.length>max? str.slice(0,max)+'...':str }
