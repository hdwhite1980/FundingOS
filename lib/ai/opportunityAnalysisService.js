// lib/ai/opportunityAnalysisService.js
// Stub implementation for opportunity (grant) analysis. Real extraction deferred until project analysis validated.

import aiProviderService from '../aiProviderService'
import { supabase } from '../supabase'

const ANALYSIS_VERSION = '0.1-stub'

export async function analyzeOpportunity({ opportunityId, force = false }) {
  if (!opportunityId) throw new Error('opportunityId required')

  // Fetch base opportunity
  const { data: opp, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .maybeSingle()
  if (error || !opp) throw new Error('Opportunity not found')

  if (!force) {
    const { data: existing } = await supabase
      .from('opportunity_ai_analysis')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
    if (existing && existing.length) {
      return { reused: true, analysis: existing[0] }
    }
  }

  // For stub: create minimal heuristic record without full LLM call to save cost
  const heuristic = buildHeuristicAnalysis(opp)

  const { data: inserted, error: insertErr } = await supabase
    .from('opportunity_ai_analysis')
    .insert([heuristic])
    .select()
    .single()
  if (insertErr) throw new Error('Failed to store stub opportunity analysis')

  return { reused: false, analysis: inserted }
}

function buildHeuristicAnalysis(opp) {
  // Simple derivations; future: call LLM with extraction prompt
  const title = (opp.title || '').toLowerCase()
  const rawText = `${opp.description || ''} ${opp.summary || ''}`.toLowerCase()
  const wants = []
  if (/community|local/.test(rawText)) wants.push('community impact')
  if (/research|study/.test(rawText)) wants.push('research')
  if (/innovation|innovative/.test(rawText)) wants.push('innovation')

  return {
    opportunity_id: opp.id,
    ai_understanding: `Stub analysis pending full AI extraction. Title: ${opp.title}`,
    funding_priorities: wants,
    eligibility_factors: [],
    preference_indicators: [],
    evaluation_criteria: [],
    keyword_indicators: (title.split(/\s+/).slice(0,8)),
    organization_fit_types: [],
    project_characteristics: [],
    geographic_preferences: [],
    competition_level: null,
    application_complexity: null,
    success_factors: [],
    common_pitfalls: [],
    analysis_version: ANALYSIS_VERSION,
    confidence_score: 0.4,
    analysis_model: 'stub'
  }
}
