// lib/ai/matchingService.js
// Placeholder matching service combining project & opportunity analysis heuristics.

export function scoreMatch(projectAnalysis, opportunityAnalysis) {
  if (!projectAnalysis || !opportunityAnalysis) return { score: 0, factors: [] }
  const pa = projectAnalysis
  const oa = opportunityAnalysis
  let score = 0
  const factors = []

  // Keyword overlap
  const projKeys = new Set((pa.alignment_keywords || []).map(k => k.toLowerCase()))
  const oppKeys = new Set((oa.keyword_indicators || []).map(k => k.toLowerCase()))
  let overlap = 0
  projKeys.forEach(k => { if (oppKeys.has(k)) overlap++ })
  if (overlap) {
    const contrib = Math.min(30, overlap * 5)
    score += contrib
    factors.push(`Keyword overlap ${overlap} (+${contrib})`)
  }

  // Focus area alignment
  const focusOverlap = intersection(pa.focus_areas, oa.funding_priorities).length
  if (focusOverlap) {
    const contrib = Math.min(25, focusOverlap * 6)
    score += contrib
    factors.push(`Focus area overlap ${focusOverlap} (+${contrib})`)
  }

  // Innovation alignment
  if (pa.innovation_level && oa.success_factors?.some(f => f.toLowerCase().includes(pa.innovation_level))) {
    score += 10; factors.push('Innovation alignment (+10)')
  }

  // Scale heuristic (simple)
  if (pa.project_scale && oa.project_characteristics?.some(c => c.toLowerCase().includes(pa.project_scale))) {
    score += 8; factors.push('Scale alignment (+8)')
  }

  // Confidence blending
  const conf = (Number(pa.confidence_score)||0.5 + Number(oa.confidence_score)||0.5)/2
  score = Math.min(100, Math.round(score + conf * 10))

  return { score, factors }
}

function intersection(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return []
  const setB = new Set(b.map(x => (x||'').toLowerCase()))
  return a.filter(x => setB.has((x||'').toLowerCase()))
}
