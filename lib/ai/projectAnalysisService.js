// lib/ai/projectAnalysisService.js
// Provides AI-driven structured analysis for projects and persistence in project_ai_analysis.

import aiProviderService from '../aiProviderService'
import { supabase } from '../supabase'
import { sendAIAnalysisNotification } from '@/lib/email'

const ANALYSIS_VERSION = '1.0'
const PROMPT_VERSION = 'v1.0'

function buildSystemPrompt() {
  return `You are an AI specializing in analyzing funding projects.
Return ONLY valid JSON. Assess project narrative, scope, beneficiaries, budget signals, innovation, sustainability.
Strict JSON keys:
{
  "ai_understanding": string,
  "key_themes": string[],
  "focus_areas": string[],
  "target_populations": string[],
  "methodology_types": string[],
  "geographic_scope": string[],
  "funding_categories": string[],
  "organization_requirements": string[],
  "alignment_keywords": string[],
  "project_scale": "small"|"medium"|"large"|"micro",
  "innovation_level": "traditional"|"innovative"|"cutting-edge",
  "evidence_strength": "emerging"|"promising"|"evidence-based",
  "budget_category": "micro"|"small"|"medium"|"large",
  "cost_effectiveness_score": number (0-1),
  "sustainability_factors": string[],
  "matching_fund_potential": "none"|"limited"|"moderate"|"strong",
  "estimated_beneficiaries": number|null,
  "impact_timeframe": "immediate"|"short-term"|"long-term"|null,
  "measurable_outcomes": string[],
  "alignment_with_priorities": string[],
  "confidence_score": number (0-1)
}`
}

function buildUserPrompt(project, orgProfile) {
  const p = project || {}
  const o = orgProfile || {}
  return `PROJECT RAW DATA:\n${JSON.stringify({
    name: p.name,
    description: p.description || p.project_narrative,
    narrative: p.project_narrative,
    categories: p.project_categories,
    funding_request_amount: p.funding_request_amount,
    estimated_people_served: p.estimated_people_served,
    location: p.location,
    type: p.project_type,
    goals: p.primary_goals,
    preferred_funding_types: p.preferred_funding_types
  }, null, 2)}\n\nORGANIZATION CONTEXT:\n${JSON.stringify({
    organization_name: o.organization_name,
    organization_type: o.organization_type,
    annual_budget: o.annual_budget,
    years_operating: o.years_operating || o.years_in_operation
  }, null, 2)}\n\nReturn the JSON now.`
}

export async function analyzeProject({ projectId, userId, force = false }) {
  if (!projectId || !userId) throw new Error('projectId and userId required')

  // 1. Fetch project & profile
  const { data: project, error: projErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle()
  if (projErr || !project) throw new Error('Project not found or access denied')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  // 2. Check existing recent analysis
  if (!force) {
    const { data: existing } = await supabase
      .from('project_ai_analysis')
      .select('*')
      .eq('project_id', projectId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
    if (existing && existing.length) {
      const last = existing[0]
      const ageMs = Date.now() - new Date(last.analyzed_at).getTime()
      if (ageMs < 1000 * 60 * 60 * 24) { // <24h reuse
        return { reused: true, analysis: last }
      }
    }
  }

  // 3. Build prompts and call provider
  const system = buildSystemPrompt()
  const userPrompt = buildUserPrompt(project, profile)

  let parsed
  try {
    const response = await aiProviderService.generateCompletion('document-analysis', [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt }
    ], { maxTokens: 1400, temperature: 0.1 })
    parsed = aiProviderService.safeParseJSON(response.content)
  } catch (e) {
    console.error('Project analysis AI parse failure', e)
    throw new Error('AI analysis failed')
  }

  // 4. Normalize & persist
  const record = mapParsedToRow({ parsed, projectId, userId })
  const { data: inserted, error: insertErr } = await supabase
    .from('project_ai_analysis')
    .insert([record])
    .select()
    .single()
  if (insertErr) {
    console.error('Insert analysis error', insertErr)
    throw new Error('Failed to store analysis')
  }

  // 5. Optional email notification
  try {
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('ai_analysis_complete')
      .eq('user_id', userId)
      .maybeSingle()
    if (prefs?.ai_analysis_complete) {
      const { data: userRec } = await supabase.auth.getUser()
      const email = userRec?.data?.user?.email
      if (email) {
        const insights = record.key_themes?.length ? record.key_themes : record.focus_areas || []
        await sendAIAnalysisNotification(email, project.name || 'Project', insights)
      }
    }
  } catch (notifyErr) {
    console.warn('Analysis notification skipped', notifyErr)
  }

  return { reused: false, analysis: inserted }
}

function mapParsedToRow({ parsed, projectId, userId }) {
  const safeNum = (v) => typeof v === 'number' && isFinite(v) ? v : null
  const cap = (arr) => Array.isArray(arr) ? arr.slice(0, 30).map(x => String(x).slice(0, 160)) : []
  return {
    project_id: projectId,
    user_id: userId,
    ai_understanding: String(parsed.ai_understanding || '').slice(0, 15000) || 'No analysis',
    key_themes: cap(parsed.key_themes),
    focus_areas: cap(parsed.focus_areas),
    target_populations: cap(parsed.target_populations),
    methodology_types: cap(parsed.methodology_types),
    geographic_scope: cap(parsed.geographic_scope),
    funding_categories: cap(parsed.funding_categories),
    organization_requirements: cap(parsed.organization_requirements),
    alignment_keywords: cap(parsed.alignment_keywords),
    project_scale: parsed.project_scale || null,
    innovation_level: parsed.innovation_level || null,
    evidence_strength: parsed.evidence_strength || null,
    budget_category: parsed.budget_category || null,
    cost_effectiveness_score: safeNum(parsed.cost_effectiveness_score),
    sustainability_factors: cap(parsed.sustainability_factors),
    matching_fund_potential: parsed.matching_fund_potential || null,
    estimated_beneficiaries: safeNum(parsed.estimated_beneficiaries),
    impact_timeframe: parsed.impact_timeframe || null,
    measurable_outcomes: cap(parsed.measurable_outcomes),
    alignment_with_priorities: cap(parsed.alignment_with_priorities),
    analysis_version: ANALYSIS_VERSION,
    confidence_score: safeNum(parsed.confidence_score) || 0.75,
    analysis_model: 'hybrid',
    analysis_prompt_version: PROMPT_VERSION
  }
}

export async function backfillAllProjects(userId, { force = false, limit = 50 } = {}) {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error('Failed to list projects')

  const results = []
  for (const p of projects) {
    try {
      const res = await analyzeProject({ projectId: p.id, userId, force })
      results.push({ projectId: p.id, status: 'ok', reused: res.reused })
    } catch (e) {
      results.push({ projectId: p.id, status: 'error', error: e.message })
    }
  }
  return results
}
