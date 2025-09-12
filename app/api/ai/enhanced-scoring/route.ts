// app/api/ai/enhanced-scoring/route.ts
// Enhanced AI scoring API route

import { NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'

export async function POST(request: Request) {
  try {
    const { opportunity, project, userProfile, action } = await request.json()

    if (!opportunity || !project || !userProfile) {
      return NextResponse.json(
        { error: 'Missing required parameters: opportunity, project, userProfile' },
        { status: 400 }
      )
    }

    let result;
    switch (action) {
      case 'fast-score':
        // NEW: Fast rule-based scoring only
        result = await fastScoreOnly(opportunity, project, userProfile)
        break
      case 'enhanced-score':
        // EXISTING: Full hybrid scoring (rule + AI)
        result = await enhancedScoring(opportunity, project, userProfile)
        break
      case 'pre-score':
        // EXISTING: Rule-based only
        result = await preScoreAnalysis(opportunity, project, userProfile)
        break
      case 'ai-analysis':
        // EXISTING: AI analysis only
        result = await aiAnalysis(opportunity, project, userProfile)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: fast-score, enhanced-score, pre-score, ai-analysis' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Enhanced scoring API error:', error)
    return NextResponse.json(
      { error: error.message || 'Enhanced scoring failed' },
      { status: 500 }
    )
  }
}

/**
 * Enhanced scoring with comprehensive data analysis
 */
async function enhancedScoring(opportunity: any, project: any, userProfile: any) {
  // First do fast scoring
  const fastScore = await fastScoreOnly(opportunity, project, userProfile)
  
  if (!fastScore.eligible) {
    return {
      overallScore: 0,
      fastScore,
      eligible: false,
      reasoning: 'Failed fast-track screening criteria'
    }
  }

  // Then do AI analysis
  const aiAnalysis = await aiAnalysisScoring(opportunity, project, userProfile)
  
  // Combine fast score and AI scores
  const finalScore = Math.round(
    (fastScore.overallScore * 0.4) + 
    (aiAnalysis.score * 0.6)
  )

  return {
    overallScore: finalScore,
    fastScore,
    aiAnalysis,
    eligible: true,
    categoryScores: {
      eligibility: Math.round(finalScore * 0.25),
      alignment: Math.round(finalScore * 0.25),
      feasibility: Math.round(finalScore * 0.25),
      aiInsight: aiAnalysis.score
    },
    strengths: [...(fastScore.strengths || []), ...(aiAnalysis.strengths || [])],
    weaknesses: [...(fastScore.weaknesses || []), ...(aiAnalysis.weaknesses || [])],
    recommendations: [...(fastScore.recommendations || []), ...(aiAnalysis.recommendations || [])],
    confidence: Math.min(fastScore.confidence || 0.7, aiAnalysis.confidence || 0.8)
  }
}

/**
 * FAST TRACK: Keyword-based scoring for instant results
 * Scans opportunities using keywords from project information
 */
async function fastScoreOnly(opportunity: any, project: any, userProfile: any) {
  const startTime = Date.now()
  
  // Generate keywords from project information
  const projectKeywords = extractProjectKeywords(project, userProfile)
  
  let score = 0
  const strengths: string[] = []
  const weaknesses: string[] = []
  const matchDetails: any = {}

  // 1. HARD STOPS (return 0 immediately)
  const hardStops = checkHardStops(opportunity, project, userProfile)
  if (!hardStops.eligible) {
    return {
      overallScore: 0,
      eligible: false,
      fastTrack: true,
      matchDetails: hardStops.reasons,
      strengths: [],
      weaknesses: hardStops.reasons,
      processingTime: Date.now() - startTime
    }
  }

  // 2. PROJECT KEYWORD MATCHING (0-40 points)
  const keywordMatch = calculateKeywordMatch(opportunity, projectKeywords)
  score += keywordMatch.score
  matchDetails.keywordMatch = keywordMatch.details
  strengths.push(...keywordMatch.strengths)
  if (keywordMatch.weaknesses.length > 0) weaknesses.push(...keywordMatch.weaknesses)

  // 3. FUNDING AMOUNT ALIGNMENT (0-25 points)
  const fundingMatch = checkFundingAlignment(opportunity, project)
  score += fundingMatch.score
  matchDetails.fundingAlignment = fundingMatch.details
  strengths.push(...fundingMatch.strengths)
  if (fundingMatch.weaknesses.length > 0) weaknesses.push(...fundingMatch.weaknesses)

  // 4. ORGANIZATION TYPE MATCH (0-20 points)
  const orgMatch = checkOrganizationType(opportunity, userProfile)
  score += orgMatch.score
  matchDetails.organizationType = orgMatch.details
  strengths.push(...orgMatch.strengths)
  if (orgMatch.weaknesses.length > 0) weaknesses.push(...orgMatch.weaknesses)

  // 5. DEADLINE URGENCY (0-10 points)
  const deadlineMatch = checkDeadlineTiming(opportunity)
  score += deadlineMatch.score
  matchDetails.deadline = deadlineMatch.details
  strengths.push(...deadlineMatch.strengths)
  if (deadlineMatch.weaknesses.length > 0) weaknesses.push(...deadlineMatch.weaknesses)

  // 6. GEOGRAPHIC ELIGIBILITY (0-5 points)
  const geoMatch = checkGeographicEligibility(opportunity, userProfile)
  score += geoMatch.score
  matchDetails.geography = geoMatch.details
  strengths.push(...geoMatch.strengths)
  if (geoMatch.weaknesses.length > 0) weaknesses.push(...geoMatch.weaknesses)

  // Calculate confidence based on data quality
  const confidence = calculateFastTrackConfidence(opportunity, project, matchDetails)

  // AI VERIFICATION for high scores (70%+)
  let aiVerification: any = null
  if (score >= 70) {
    try {
      aiVerification = await performQuickAIVerification(opportunity, project, userProfile, score, matchDetails)
      // Adjust score based on AI verification if it disagrees significantly
      if (aiVerification && aiVerification.adjustedScore && Math.abs(aiVerification.adjustedScore - score) > 15) {
        score = Math.round((score + aiVerification.adjustedScore) / 2) // Average the scores
      }
    } catch (error) {
      console.warn('AI verification failed for high score:', error)
    }
  }

  return {
    overallScore: Math.min(Math.round(score), 100),
    eligible: score > 20, // Must score at least 20 to be considered viable
    fastTrack: true,
    confidence,
    aiVerification,
    matchDetails,
    strengths,
    weaknesses,
    recommendations: generateQuickRecommendations(score, matchDetails),
    processingTime: Date.now() - startTime,
    keywordsUsed: projectKeywords.primary.concat(projectKeywords.secondary).slice(0, 10)
  }
}

/**
 * Extract relevant keywords from project and user profile
 */
function extractProjectKeywords(project: any, userProfile: any) {
  const keywords = {
    primary: [] as string[], // High value keywords
    secondary: [] as string[], // Supporting keywords
    focus_areas: [] as string[], // Specific focus areas
    populations: [] as string[] // Target populations
  }

  // Project-specific keywords
  if (project.title) {
    keywords.primary.push(...extractImportantWords(project.title))
  }
  if (project.description) {
    keywords.primary.push(...extractImportantWords(project.description))
  }
  if (project.project_category) {
    keywords.primary.push(project.project_category.toLowerCase())
  }
  if (project.primary_goals) {
    project.primary_goals.forEach((goal: string) => {
      keywords.secondary.push(...extractImportantWords(goal))
    })
  }

  // User profile keywords
  if (userProfile.primary_focus_areas) {
    keywords.focus_areas = Array.from(userProfile.primary_focus_areas)
  }
  if (userProfile.populations_served) {
    keywords.populations = Array.from(userProfile.populations_served)
  }
  if (userProfile.organization_type) {
    keywords.secondary.push(userProfile.organization_type.toLowerCase())
  }

  // Clean and deduplicate
  keywords.primary = Array.from(new Set(keywords.primary.filter(k => k.length > 3)))
  keywords.secondary = Array.from(new Set(keywords.secondary.filter(k => k.length > 3)))
  
  return keywords
}

/**
 * Extract important words from text (remove common words)
 */
function extractImportantWords(text: string): string[] {
  if (!text) return []
  
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']
  
  return text.toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .slice(0, 15) // Limit to prevent too many keywords
}

/**
 * Check for hard stops that immediately disqualify
 */
function checkHardStops(opportunity: any, project: any, userProfile: any) {
  const reasons: string[] = []

  // Organization type check
  if (opportunity.organization_types?.length > 0 && 
      !opportunity.organization_types.includes(userProfile.organization_type) && 
      !opportunity.organization_types.includes('all')) {
    reasons.push('Organization type not eligible')
  }

  // Budget alignment check
  const requestAmount = project.funding_request_amount || project.total_project_budget
  if (opportunity.amount_min && requestAmount) {
    const ratio = requestAmount / opportunity.amount_min
    if (ratio < 0.1) reasons.push('Requested amount too low for this opportunity')
    if (ratio > 10) reasons.push('Requested amount too high for this opportunity')
  }

  // Deadline check
  if (opportunity.deadline_date) {
    const daysLeft = Math.ceil((new Date(opportunity.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) reasons.push('Application deadline has passed')
  }

  return {
    eligible: reasons.length === 0,
    reasons
  }
}

/**
 * Calculate keyword matching score
 */
function calculateKeywordMatch(opportunity: any, keywords: any) {
  const oppText = [
    opportunity.title || '',
    opportunity.description || '',
    opportunity.synopsis || '',
    (opportunity.focus_areas || []).join(' '),
    (opportunity.target_populations || []).join(' ')
  ].join(' ').toLowerCase()

  let score = 0
  const strengths: string[] = []
  const weaknesses: string[] = []
  const matchedKeywords: string[] = []

  // Check primary keywords (worth more)
  keywords.primary.forEach((keyword: string) => {
    if (oppText.includes(keyword.toLowerCase())) {
      score += 4
      matchedKeywords.push(keyword)
    }
  })

  // Check secondary keywords
  keywords.secondary.forEach((keyword: string) => {
    if (oppText.includes(keyword.toLowerCase())) {
      score += 2
      matchedKeywords.push(keyword)
    }
  })

  // Check focus areas (high value)
  keywords.focus_areas.forEach((area: string) => {
    if (oppText.includes(area.toLowerCase())) {
      score += 6
      matchedKeywords.push(area)
    }
  })

  // Check populations (medium value)
  keywords.populations.forEach((pop: string) => {
    if (oppText.includes(pop.toLowerCase())) {
      score += 3
      matchedKeywords.push(pop)
    }
  })

  // Cap at 40 points
  score = Math.min(score, 40)

  if (score >= 20) strengths.push(`Strong keyword alignment (${matchedKeywords.length} matches)`)
  else if (score >= 10) strengths.push(`Moderate keyword alignment (${matchedKeywords.length} matches)`)
  else weaknesses.push('Limited keyword alignment with project focus')

  return {
    score,
    strengths,
    weaknesses,
    details: {
      matchedKeywords: matchedKeywords.slice(0, 10),
      totalMatches: matchedKeywords.length,
      scoreBreakdown: { primary: keywords.primary.length, secondary: keywords.secondary.length }
    }
  }
}

/**
 * Check funding alignment
 */
function checkFundingAlignment(opportunity: any, project: any) {
  const requestAmount = project.funding_request_amount || project.total_project_budget
  let score = 0
  const strengths: string[] = []
  const weaknesses: string[] = []

  if (!requestAmount || (!opportunity.amount_min && !opportunity.amount_max)) {
    return { score: 12, strengths: ['Funding information available'], weaknesses: [], details: {} }
  }

  const min = opportunity.amount_min || 0
  const max = opportunity.amount_max || opportunity.amount_min || requestAmount * 2

  if (requestAmount >= min && requestAmount <= max) {
    score = 25 // Perfect fit
    strengths.push(`Funding request (${requestAmount}) within opportunity range`)
  } else if (requestAmount >= min * 0.8 && requestAmount <= max * 1.2) {
    score = 20 // Close fit
    strengths.push(`Funding request close to opportunity range`)
  } else if (requestAmount >= min * 0.5 && requestAmount <= max * 2) {
    score = 10 // Workable
    strengths.push(`Funding request potentially workable`)
  } else {
    score = 0
    weaknesses.push(`Funding request (${requestAmount}) not aligned with opportunity range`)
  }

  return {
    score,
    strengths,
    weaknesses,
    details: {
      requestAmount,
      opportunityMin: min,
      opportunityMax: max,
      alignmentRatio: requestAmount / (min || requestAmount)
    }
  }
}

/**
 * Check organization type compatibility
 */
function checkOrganizationType(opportunity: any, userProfile: any) {
  let score = 0
  const strengths: string[] = []
  const weaknesses: string[] = []

  if (!opportunity.organization_types || opportunity.organization_types.includes('all')) {
    score = 20
    strengths.push('Organization type eligible')
  } else if (opportunity.organization_types.includes(userProfile.organization_type)) {
    score = 20
    strengths.push(`${userProfile.organization_type} organizations explicitly eligible`)
  } else {
    score = 0
    weaknesses.push(`${userProfile.organization_type} organizations may not be eligible`)
  }

  return {
    score,
    strengths,
    weaknesses,
    details: {
      userOrgType: userProfile.organization_type,
      eligibleTypes: opportunity.organization_types || []
    }
  }
}

/**
 * Check deadline timing
 */
function checkDeadlineTiming(opportunity: any) {
  let score = 0
  const strengths: string[] = []
  const weaknesses: string[] = []

  if (!opportunity.deadline_date) {
    return { score: 5, strengths: ['No immediate deadline pressure'], weaknesses: [], details: {} }
  }

  const daysLeft = Math.ceil((new Date(opportunity.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft >= 60) {
    score = 10
    strengths.push(`Ample time for application (${daysLeft} days)`)
  } else if (daysLeft >= 30) {
    score = 8
    strengths.push(`Good time for application (${daysLeft} days)`)
  } else if (daysLeft >= 14) {
    score = 5
    weaknesses.push(`Limited time for application (${daysLeft} days)`)
  } else if (daysLeft > 0) {
    score = 2
    weaknesses.push(`Very limited time for application (${daysLeft} days)`)
  } else {
    score = 0
    weaknesses.push('Application deadline has passed')
  }

  return {
    score,
    strengths,
    weaknesses,
    details: {
      daysLeft,
      deadline: opportunity.deadline_date
    }
  }
}

/**
 * Check geographic eligibility
 */
function checkGeographicEligibility(opportunity: any, userProfile: any) {
  let score = 0
  const strengths: string[] = []
  const weaknesses: string[] = []

  // Basic geographic checking - can be enhanced based on actual data structure
  if (!opportunity.geographic_restrictions) {
    score = 5
    strengths.push('No geographic restrictions')
  } else if (userProfile.state && opportunity.geographic_restrictions.includes(userProfile.state)) {
    score = 5
    strengths.push(`${userProfile.state} is eligible`)
  } else {
    score = 0
    weaknesses.push('Geographic restrictions may apply')
  }

  return {
    score,
    strengths,
    weaknesses,
    details: {
      userLocation: userProfile.state || userProfile.location,
      restrictions: opportunity.geographic_restrictions || []
    }
  }
}

/**
 * Calculate confidence based on data quality
 */
function calculateFastTrackConfidence(opportunity: any, project: any, matchDetails: any): number {
  let confidence = 0.3 // Base confidence for fast track

  // Boost confidence based on data completeness
  if (opportunity.title && opportunity.description) confidence += 0.2
  if (project.title && project.description) confidence += 0.2
  if (opportunity.amount_min || opportunity.amount_max) confidence += 0.1
  if (opportunity.deadline_date) confidence += 0.1
  if (matchDetails.keywordMatch?.totalMatches > 5) confidence += 0.1

  return Math.min(confidence, 0.9) // Max 90% confidence for fast track
}

/**
 * Generate quick recommendations based on score and match details
 */
function generateQuickRecommendations(score: number, matchDetails: any): string[] {
  const recommendations: string[] = []

  if (score >= 80) {
    recommendations.push('Excellent match - consider prioritizing this opportunity')
    recommendations.push('Run detailed AI analysis to refine application strategy')
  } else if (score >= 60) {
    recommendations.push('Good match - worth detailed investigation')
    recommendations.push('Review specific requirements and deadlines')
  } else if (score >= 40) {
    recommendations.push('Moderate match - evaluate if project can be adapted')
    recommendations.push('Consider partnership opportunities to strengthen application')
  } else if (score >= 20) {
    recommendations.push('Weak match - consider only if few other options available')
    recommendations.push('Significant project modifications may be needed')
  } else {
    recommendations.push('Poor match - likely not worth pursuing')
    recommendations.push('Focus efforts on higher-scoring opportunities')
  }

  // Add specific recommendations based on match details
  if (matchDetails.keywordMatch?.totalMatches < 3) {
    recommendations.push('Consider refining project description to better align with opportunity focus')
  }
  if (matchDetails.deadline?.daysLeft < 30) {
    recommendations.push('Time is critical - expedite application preparation if pursuing')
  }

  return recommendations
}

/**
 * Quick AI verification for high scores (70%+)
 */
async function performQuickAIVerification(opportunity: any, project: any, userProfile: any, currentScore: number, matchDetails: any) {
  const prompt = `
QUICK VERIFICATION: Score verification for high-scoring opportunity match.

CURRENT SCORE: ${currentScore}/100 (Fast-track algorithm)

OPPORTUNITY: ${opportunity.title || 'Unknown'}
Description: ${(opportunity.description || '').substring(0, 500)}
Funding: ${opportunity.amount_min || 'Unknown'} - ${opportunity.amount_max || 'Unknown'}

PROJECT: ${project.title || 'Unknown'}  
Description: ${(project.description || '').substring(0, 500)}
Budget: ${project.funding_request_amount || project.total_project_budget || 'Unknown'}

MATCH DETAILS:
- Keywords matched: ${matchDetails.keywordMatch?.totalMatches || 0}
- Funding alignment: ${matchDetails.fundingAlignment?.alignmentRatio || 'Unknown'}

TASK: Quickly verify if this ${currentScore}% score is reasonable. 
Consider: eligibility, strategic fit, competition level, realistic success probability.

Respond with JSON:
{
  "verified": true/false,
  "adjustedScore": 0-100 (if different from ${currentScore}),
  "reasoning": "brief explanation",
  "confidence": 0.0-1.0
}
`

  const response = await aiProviderService.generateCompletion(
    'opportunity-scoring',
    [
      {
        role: 'system',
        content: 'You are a grant funding expert doing quick score verification. Be concise and practical. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    {
      maxTokens: 300,
      temperature: 0.2,
      responseFormat: 'json_object'
    }
  )

  if (!response?.content) {
    throw new Error('No AI verification response')
  }

  return aiProviderService.safeParseJSON(response.content)
}

/**
 * Simplified pre-score analysis for backward compatibility
 */
async function preScoreAnalysis(opportunity: any, project: any, userProfile: any) {
  // Just call the fast score function for now - they serve the same purpose
  return await fastScoreOnly(opportunity, project, userProfile)
}

/**
 * Calculate compliance readiness score
 */
function calculateComplianceScore(userProfile: any): number {
  let score = 0
  
  // EIN/Tax ID
  if (userProfile.ein || userProfile.tax_id) score += 5
  
  // DUNS/UEI number
  if (userProfile.duns_uei) score += 5
  
  // SAM.gov registration
  if (userProfile.sam_registration === 'active') score += 10
  else if (userProfile.sam_registration === 'pending') score += 5
  
  // Audit status
  if (userProfile.audit_status === 'clean') score += 5
  else if (userProfile.audit_status === 'qualified') score += 3
  
  return Math.min(score, 25) // Max 25 points
}

/**
 * Calculate strategic fit score
 */
function calculateStrategicFit(opportunity: any, project: any, userProfile: any): number {
  let score = 0
  
  // Focus area alignment
  if (userProfile.primary_focus_areas && opportunity.focus_areas) {
    const userFocusArray = Array.from(userProfile.primary_focus_areas)
    const oppFocusArray = Array.from(opportunity.focus_areas)
    const intersection = userFocusArray.filter(x => oppFocusArray.includes(x))
    score += Math.min(intersection.length * 5, 15)
  }
  
  // Population served alignment
  if (userProfile.populations_served && opportunity.target_populations) {
    const userPopArray = Array.from(userProfile.populations_served)
    const oppPopArray = Array.from(opportunity.target_populations)
    const intersection = userPopArray.filter(x => oppPopArray.includes(x))
    score += Math.min(intersection.length * 3, 10)
  }
  
  return Math.min(score, 25) // Max 25 points
}

/**
 * Calculate project readiness score
 */
function calculateReadinessScore(project: any): number {
  let score = 0
  
  // Project status
  if (project.current_status === 'planning') score += 15
  else if (project.current_status === 'pilot') score += 20
  else if (project.current_status === 'operational') score += 10
  
  // Clear goals and outcomes
  if (project.primary_goals && project.primary_goals.length > 0) score += 5
  if (project.outcome_measures && project.outcome_measures.length > 0) score += 5
  
  // Innovation factor
  if (project.unique_innovation) score += 5
  
  return Math.min(score, 25) // Max 25 points
}

/**
 * AI-powered analysis using hybrid provider
 */
async function aiAnalysisScoring(opportunity: any, project: any, userProfile: any) {
  const prompt = `
As a grant funding expert, analyze this opportunity match and provide a detailed scoring assessment:

OPPORTUNITY:
Title: ${opportunity.title}
Description: ${opportunity.description || 'N/A'}
Funding Amount: ${opportunity.amount_min || 'N/A'} - ${opportunity.amount_max || 'N/A'}
Focus Areas: ${opportunity.focus_areas?.join(', ') || 'N/A'}
Requirements: ${opportunity.requirements || 'N/A'}

ORGANIZATION:
Type: ${userProfile.organization_type}
Focus Areas: ${userProfile.primary_focus_areas?.join(', ') || 'N/A'}
Annual Budget: ${userProfile.annual_budget || 'N/A'}
Years Operating: ${userProfile.years_operating || 'N/A'}

PROJECT:
Title: ${project.title}
Description: ${project.description || 'N/A'}
Category: ${project.project_category || project.category || 'N/A'}
Budget Request: ${project.funding_request_amount || project.total_project_budget || 'N/A'}
Target Population: ${project.target_population_description || 'N/A'}

Please provide:
1. Overall compatibility score (0-100)
2. Top 3 strengths of this match
3. Top 3 potential weaknesses or concerns
4. 3 specific recommendations to improve the application
5. Confidence level in this assessment (0.0-1.0)

Format your response as JSON with these exact keys: score, strengths, weaknesses, recommendations, confidence, reasoning
`

  try {
    const response = await aiProviderService.generateCompletion(
      'enhanced-scoring',
      [
        {
          role: 'system',
          content: 'You are an expert grant funding analyst. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        maxTokens: 1500,
        temperature: 0.3,
        responseFormat: 'json_object'
      }
    )

    if (!response?.content) {
      throw new Error('No response from AI provider')
    }

    // Parse JSON response
    const analysis = aiProviderService.safeParseJSON(response.content)
    
    // Validate required fields
    if (typeof analysis.score !== 'number' || !Array.isArray(analysis.strengths)) {
      throw new Error('Invalid response format from AI')
    }

    return {
      score: Math.max(0, Math.min(100, analysis.score)),
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      recommendations: analysis.recommendations || [],
      confidence: Math.max(0, Math.min(1, analysis.confidence || 0.7)),
      reasoning: analysis.reasoning || 'AI analysis completed'
    }

  } catch (error) {
    console.error('AI analysis failed:', error)
    
    // Fallback to basic analysis
    return {
      score: 50,
      strengths: ['Basic compatibility confirmed'],
      weaknesses: ['Detailed AI analysis unavailable'],
      recommendations: ['Manual review recommended'],
      confidence: 0.4,
      reasoning: 'AI analysis failed, using fallback scoring'
    }
  }
}

/**
 * Export for use in preScore route action
 */
async function aiAnalysis(opportunity: any, project: any, userProfile: any) {
  return await aiAnalysisScoring(opportunity, project, userProfile)
}