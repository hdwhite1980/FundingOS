// lib/fieldDescriptions.js
// Descriptive hover text for project creation fields (not improvement guidance)
export const fieldDescriptions = {
  project_title: 'A concise, specific title that funders can instantly understand.',
  project_description: 'High-level narrative: problem, beneficiaries, solution approach, scale, and intended change.',
  target_population_description: 'Who you will serve (demographics, geography, need) and why they need this intervention now.',
  total_project_budget: 'Full cost of the entire project (not just this funding request).',
  budget_breakdown: 'Percent allocation across key cost categories (personnel, equipment, travel, indirect, other).',
  primary_goals: '3–5 specific objectives that define success and align with mission and funder priorities.',
  output_measures: 'Direct products/activities delivered (events held, people trained, materials produced).',
  outcome_measures: 'Short to mid-term changes in participants (knowledge, behavior, condition).',
  impact_measures: 'Longer-term community or systemic change you reasonably influence.',
  funding_request_amount: 'Amount you are seeking from a single funder in a forthcoming application.',
  cash_match_available: 'Committed or likely cash resources you can leverage for this project.',
  in_kind_match_available: 'Non-cash resources already committed (volunteer time, space, services, equipment).'
}

export function getFieldDescription(key){
  return fieldDescriptions[key] || ''
}
