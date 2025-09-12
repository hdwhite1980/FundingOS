// Enhanced Quick Match Scoring Algorithm
// This algorithm focuses more on PROJECT-SPECIFIC alignment rather than general categorical matches

export const calculateImprovedQuickScore = (selectedProject, opportunity, userProfile) => {
  let score = 0
  let maxPossibleScore = 0
  
  // === PROJECT-SPECIFIC ALIGNMENT (60% of total weight) ===
  
  // 1. Project Description & Keywords Match (25 points max)
  maxPossibleScore += 25
  if (selectedProject.description && opportunity.description) {
    const projectKeywords = extractKeywords(selectedProject.description.toLowerCase())
    const oppKeywords = extractKeywords(opportunity.description.toLowerCase())
    const keywordOverlap = calculateKeywordOverlap(projectKeywords, oppKeywords)
    score += Math.floor(keywordOverlap * 25) // 0-25 points based on keyword similarity
  }
  
  // 2. Project Goals vs Opportunity Focus (20 points max)
  maxPossibleScore += 20
  if (selectedProject.goals && opportunity.focus_areas) {
    const goalAlignment = calculateGoalAlignment(selectedProject.goals, opportunity.focus_areas)
    score += Math.floor(goalAlignment * 20)
  } else if (selectedProject.project_type && opportunity.project_types?.includes(selectedProject.project_type)) {
    score += 20 // Full points for exact project type match
  } else if (selectedProject.project_type && opportunity.project_types?.some(type => 
    type.includes(selectedProject.project_type?.split('_')[0]) || 
    selectedProject.project_type?.includes(type.split('_')[0])
  )) {
    score += 12 // Partial points for related project types
  }
  
  // 3. Funding Amount Precision (15 points max)
  maxPossibleScore += 15
  if (opportunity.amount_min && opportunity.amount_max && selectedProject.funding_needed) {
    const projectNeed = selectedProject.funding_needed
    if (projectNeed >= opportunity.amount_min && projectNeed <= opportunity.amount_max) {
      score += 15 // Perfect fit within range
    } else if (projectNeed <= opportunity.amount_max * 1.1) { // Within 10% of max
      score += 12 // Very close fit
    } else if (projectNeed <= opportunity.amount_max) {
      score += 8 // Can cover the need
    } else if (projectNeed >= opportunity.amount_min) {
      score += 4 // Partial funding possible
    }
    // No points if completely outside range
  }

  // === PRACTICAL VIABILITY (30% of total weight) ===
  
  // 4. Eligibility & Requirements Match (20 points max)
  maxPossibleScore += 20
  if (opportunity.eligibility) {
    if (opportunity.eligibility.eligible) {
      // Base eligibility points scaled by confidence
      const basePoints = Math.floor(opportunity.eligibility.confidence * 0.15) // 0-15 points
      score += basePoints
      
      // Bonus for having advantages
      if (opportunity.eligibility.checks?.certifications?.advantages?.length > 0) {
        score += 5
      }
    } else {
      score -= 10 // Penalty for ineligible opportunities (but not as harsh)
    }
    
    // Small penalty for warnings (shows complexity)
    if (opportunity.eligibility.warnings?.length > 0) {
      score -= Math.min(5, opportunity.eligibility.warnings.length) // Max -5 points
    }
  } else {
    score += 10 // Assume eligible if no check available
  }
  
  // 5. Timeline Viability (10 points max)
  maxPossibleScore += 10
  if (opportunity.deadline_date) {
    const daysUntilDeadline = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
    if (daysUntilDeadline > 30 && daysUntilDeadline <= 90) {
      score += 10 // Optimal timing
    } else if (daysUntilDeadline > 14 && daysUntilDeadline <= 180) {
      score += 8 // Good timing
    } else if (daysUntilDeadline > 7 && daysUntilDeadline <= 14) {
      score += 5 // Urgent but doable
    } else if (daysUntilDeadline > 0 && daysUntilDeadline <= 7) {
      score += 2 // Very urgent, risky
    }
    // No points for past deadlines
  } else {
    score += 6 // Rolling deadlines are convenient
  }

  // === STRATEGIC FIT (10% of total weight) ===
  
  // 6. Geographic & Market Alignment (5 points max)
  maxPossibleScore += 5
  if (opportunity.geography?.includes('nationwide')) {
    score += 5 // Always accessible
  } else if (selectedProject.location && opportunity.geography?.some(geo => 
    selectedProject.location.toLowerCase().includes(geo.toLowerCase())
  )) {
    score += 5 // Perfect geographic match
  } else if (opportunity.geography?.length > 5) { // Multi-state opportunities
    score += 3 // Likely accessible
  }
  
  // 7. Competition Level (5 points max)
  maxPossibleScore += 5
  if (opportunity.competition_level === 'low') {
    score += 5
  } else if (opportunity.competition_level === 'medium') {
    score += 3
  } else if (opportunity.competition_level === 'high') {
    score += 1 // Still possible, just harder
  } else {
    score += 2 // Unknown competition
  }

  // === NORMALIZE TO 0-100 SCALE ===
  const normalizedScore = Math.round((score / maxPossibleScore) * 100)
  
  return {
    score: Math.min(normalizedScore, 100),
    breakdown: {
      projectAlignment: Math.floor((score / maxPossibleScore) * 60), // Out of 60
      practicalViability: Math.floor((score / maxPossibleScore) * 30), // Out of 30
      strategicFit: Math.floor((score / maxPossibleScore) * 10), // Out of 10
      rawScore: score,
      maxPossible: maxPossibleScore
    }
  }
}

// Helper functions
const extractKeywords = (text) => {
  // Remove common words and extract meaningful terms
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word))
    .slice(0, 20) // Limit to top 20 keywords
}

const calculateKeywordOverlap = (keywords1, keywords2) => {
  if (keywords1.length === 0 || keywords2.length === 0) return 0
  
  const overlap = keywords1.filter(keyword => keywords2.includes(keyword)).length
  const totalUnique = new Set([...keywords1, ...keywords2]).size
  
  return overlap / Math.max(keywords1.length, keywords2.length) // Jaccard similarity
}

const calculateGoalAlignment = (projectGoals, opportunityFocus) => {
  if (!projectGoals || !opportunityFocus) return 0
  
  const goalKeywords = extractKeywords(JSON.stringify(projectGoals).toLowerCase())
  const focusKeywords = extractKeywords(JSON.stringify(opportunityFocus).toLowerCase())
  
  return calculateKeywordOverlap(goalKeywords, focusKeywords)
}

// Usage example:
/*
const quickScore = calculateImprovedQuickScore(selectedProject, opportunity, userProfile)
console.log(`Quick Match: ${quickScore.score}%`)
console.log('Breakdown:', quickScore.breakdown)
*/