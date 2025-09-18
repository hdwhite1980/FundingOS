// app/api/ai/enhanced-scoring/route.ts
// Enhanced AI scoring API route

import { NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'

// Helper function to handle array or text fields safely
function safeJoinField(field: any): string {
  if (!field) return ''
  if (Array.isArray(field)) return field.join(' ')
  if (typeof field === 'string') return field
  return String(field)
}

// Helper function to safely get array from field that might be text, array, or JSONB
function safeArrayField(field: any): string[] {
  if (!field) return []
  if (Array.isArray(field)) return field
  if (typeof field === 'string') {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(field)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // If not JSON, split by common delimiters
      return field.split(/[,;|]/).map(s => s.trim()).filter(s => s.length > 0)
    }
  }
  return []
}

export async function POST(request: Request) {
  try {
    const { opportunity, project, userProfile, action } = await request.json()

    // Enhanced error logging
    console.log('Enhanced Scoring API Request:', {
      hasOpportunity: !!opportunity,
      hasProject: !!project, 
      hasUserProfile: !!userProfile,
      action: action,
      opportunityKeys: opportunity ? Object.keys(opportunity) : 'null',
      projectKeys: project ? Object.keys(project) : 'null',
      userProfileKeys: userProfile ? Object.keys(userProfile) : 'null'
    })

    // More specific validation to handle empty objects
    const isValidOpportunity = opportunity && typeof opportunity === 'object' && Object.keys(opportunity).length > 0
    const isValidProject = project && typeof project === 'object' && Object.keys(project).length > 0

    if (!isValidOpportunity || !isValidProject) {
      console.error('Missing or empty required parameters:', {
        opportunity: {
          exists: !!opportunity,
          isObject: typeof opportunity === 'object',
          hasKeys: opportunity ? Object.keys(opportunity).length : 0
        },
        project: {
          exists: !!project,
          isObject: typeof project === 'object', 
          hasKeys: project ? Object.keys(project).length : 0
        },
        userProfile: !!userProfile
      })
      return NextResponse.json(
        { 
          error: 'Missing required parameters: opportunity and project must be non-empty objects. userProfile is optional but recommended for better accuracy.',
          details: {
            opportunityValid: isValidOpportunity,
            projectValid: isValidProject,
            received: {
              opportunityKeys: opportunity ? Object.keys(opportunity) : 'null',
              projectKeys: project ? Object.keys(project) : 'null'
            }
          }
        },
        { status: 400 }
      )
    }

    // Create a default userProfile if not provided
    const defaultUserProfile = {
      organization_type: 'unknown',
      organization_name: 'Unknown Organization',
      user_role: 'company',
      location: 'Unknown',
      full_name: 'Unknown User'
    }

    const finalUserProfile = userProfile && Object.keys(userProfile).length > 0 ? userProfile : defaultUserProfile

    console.log('Using userProfile:', finalUserProfile.organization_type, finalUserProfile.organization_name)

    let result;
    switch (action) {
      case 'fast-score':
        // NEW: Fast rule-based scoring only
        result = await fastScoreOnly(opportunity, project, finalUserProfile)
        break
      case 'enhanced-score':
        // EXISTING: Full hybrid scoring (rule + AI)
        result = await enhancedScoring(opportunity, project, finalUserProfile)
        break
      case 'pre-score':
        // EXISTING: Rule-based only
        result = await preScoreAnalysis(opportunity, project, finalUserProfile)
        break
      case 'ai-analysis':
        // EXISTING: AI analysis only
        result = await aiAnalysis(opportunity, project, finalUserProfile)
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
    (aiAnalysis.fitScore * 0.6)
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
      aiInsight: aiAnalysis.fitScore
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
  
  try {
    console.log('🚀 Fast scoring started for:', {
      opportunityTitle: opportunity.title,
      projectTitle: project.title || project.name,
      userOrgType: userProfile.organization_type
    })

    // Generate keywords from project information
    const projectKeywords = extractProjectKeywords(project, userProfile)
    
    console.log('🔑 Extracted keywords:', projectKeywords)

    let score = 0
    const strengths: string[] = []
    const weaknesses: string[] = []
    const matchDetails: any = {}

    // 1. HARD STOPS (return 0 immediately)
    const hardStops = checkHardStops(opportunity, project, userProfile)
    if (!hardStops.eligible) {
      console.log('❌ Hard stop triggered:', hardStops.reasons)
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

    console.log('📝 Keyword match result:', {
      score: keywordMatch.score,
      totalScore: score,
      matches: keywordMatch.details.totalMatches
    })

  // 3. FUNDING AMOUNT ALIGNMENT (0-25 points)
  const fundingMatch = checkFundingAlignment(opportunity, project)
  score += fundingMatch.score
  matchDetails.fundingAlignment = fundingMatch.details
  strengths.push(...fundingMatch.strengths)
  if (fundingMatch.weaknesses.length > 0) weaknesses.push(...fundingMatch.weaknesses)

  console.log('💰 Funding alignment result:', {
    score: fundingMatch.score,
    totalScore: score,
    requestAmount: fundingMatch.details?.requestAmount,
    oppMin: fundingMatch.details?.opportunityMin,
    oppMax: fundingMatch.details?.opportunityMax
  })

  // 4. ORGANIZATION TYPE MATCH (0-20 points)
  const orgMatch = checkOrganizationType(opportunity, userProfile)
  score += orgMatch.score
  matchDetails.organizationType = orgMatch.details
  strengths.push(...orgMatch.strengths)
  if (orgMatch.weaknesses.length > 0) weaknesses.push(...orgMatch.weaknesses)

  console.log('🏢 Organization type result:', {
    score: orgMatch.score,
    totalScore: score,
    userType: orgMatch.details?.userOrgType,
    eligibleTypes: orgMatch.details?.eligibleTypes
  })

  // 5. DEADLINE URGENCY (0-10 points)
  const deadlineMatch = checkDeadlineTiming(opportunity)
  score += deadlineMatch.score
  matchDetails.deadline = deadlineMatch.details
  strengths.push(...deadlineMatch.strengths)
  if (deadlineMatch.weaknesses.length > 0) weaknesses.push(...deadlineMatch.weaknesses)

  console.log('⏰ Deadline timing result:', {
    score: deadlineMatch.score,
    totalScore: score,
    daysLeft: deadlineMatch.details?.daysLeft
  })

  // 6. GEOGRAPHIC ELIGIBILITY (0-5 points)
  const geoMatch = checkGeographicEligibility(opportunity, userProfile)
  score += geoMatch.score
  matchDetails.geography = geoMatch.details
  strengths.push(...geoMatch.strengths)
  if (geoMatch.weaknesses.length > 0) weaknesses.push(...geoMatch.weaknesses)

  console.log('🌍 Geographic eligibility result:', {
    score: geoMatch.score,
    totalScore: score,
    userLocation: geoMatch.details?.userLocation,
    restrictions: geoMatch.details?.restrictions
  })

  // Calculate confidence based on data quality
  let confidence = calculateFastTrackConfidence(opportunity, project, matchDetails)

  console.log('🎯 Final fast scoring result:', {
    finalScore: score,
    confidence,
    eligible: score > 20,
    processingTime: Date.now() - startTime
  })

  // AI VERIFICATION for high scores (70%+)
  let aiVerification: any = null
  if (score >= 70) {
    try {
      aiVerification = await performQuickAIVerification(opportunity, project, userProfile, score, matchDetails)
      // Adjust score based on AI verification if it disagrees significantly
      if (aiVerification && aiVerification.adjustedScore && Math.abs(aiVerification.adjustedScore - score) > 15) {
        const originalScore = score
        score = Math.round((score + aiVerification.adjustedScore) / 2) // Average the scores
        console.log(`🤖 AI verification adjusted score from ${originalScore} to ${score}`)
      }
    } catch (error) {
      console.warn('AI verification failed for high score:', error)
    }
  }

  // Final thematic alignment adjustment
  // If we have very low keyword alignment but passed other checks, reduce confidence
  if (matchDetails.keywordMatch?.totalMatches <= 1 && score > 30) {
    console.log(`⚠️ Low thematic alignment detected (${matchDetails.keywordMatch?.totalMatches} matches) with high score (${score}) - applying confidence penalty`)
    confidence = Math.max(confidence - 0.3, 0.1) // Reduce confidence significantly
    
    // Also apply a slight score penalty for poor thematic fit
    if (matchDetails.keywordMatch?.totalMatches === 0) {
      score = Math.max(score - 10, 0)
      console.log(`🔻 Applied no-match penalty, adjusted score to ${score}`)
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
  
  } catch (error) {
    console.error('Fast scoring error:', error)
    return {
      overallScore: 0,
      eligible: false,
      fastTrack: true,
      error: 'Fast scoring failed',
      processingTime: Date.now() - startTime
    }
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

  console.log('🔍 Extracting keywords from:', {
    projectTitle: project.title || project.name,
    projectCategory: project.project_category || project.category,
    orgType: userProfile.organization_type,
    focusAreas: userProfile.primary_focus_areas
  })

  // Project-specific keywords
  if (project.title || project.name) {
    const title = project.title || project.name
    keywords.primary.push(...extractImportantWords(title))
    console.log('📝 Title keywords:', extractImportantWords(title))
  }
  
  if (project.description) {
    const descWords = extractImportantWords(project.description)
    keywords.primary.push(...descWords.slice(0, 8)) // Limit to most important
    keywords.secondary.push(...descWords.slice(8, 15))
    console.log('📄 Description keywords (primary):', descWords.slice(0, 8))
    console.log('📄 Description keywords (secondary):', descWords.slice(8, 15))
  }
  
  if (project.project_category || project.category) {
    const category = (project.project_category || project.category).toLowerCase()
    keywords.primary.push(category)
    console.log('📂 Category keyword:', category)
    
    // Add related terms based on category
    const categoryMappings: { [key: string]: string[] } = {
      'technology': ['innovation', 'digital', 'software', 'tech', 'automation', 'ai', 'data', 'computer'],
      'healthcare': ['medical', 'health', 'patient', 'clinical', 'therapeutic', 'wellness'],
      'education': ['learning', 'academic', 'student', 'teaching', 'curriculum', 'school'],
      'environment': ['green', 'sustainable', 'climate', 'conservation', 'renewable', 'eco'],
      'business': ['commercial', 'enterprise', 'startup', 'entrepreneurship', 'economic', 'market'],
      'research': ['scientific', 'study', 'analysis', 'investigation', 'development'],
      'community': ['social', 'public', 'civic', 'local', 'neighborhood', 'outreach'],
      'arts': ['creative', 'cultural', 'artistic', 'music', 'visual', 'performance']
    }
    
    const relatedTerms = categoryMappings[category] || []
    keywords.secondary.push(...relatedTerms)
    console.log('🔗 Related terms for', category, ':', relatedTerms)
  }
  
  if (project.primary_goals && Array.isArray(project.primary_goals)) {
    project.primary_goals.forEach((goal: string) => {
      keywords.secondary.push(...extractImportantWords(goal))
    })
    console.log('🎯 Goal keywords:', project.primary_goals.flatMap((g: string) => extractImportantWords(g)))
  }

  // Enhanced project field extraction
  const projectFields = [
    'target_population', 'target_population_description',
    'unique_innovation', 'innovation_description',
    'outcome_measures', 'expected_outcomes',
    'methodology', 'approach'
  ]
  
  projectFields.forEach(field => {
    if (project[field]) {
      const fieldWords = extractImportantWords(project[field])
      keywords.secondary.push(...fieldWords.slice(0, 3)) // Limit per field
      console.log(`📊 ${field} keywords:`, fieldWords.slice(0, 3))
    }
  })

  // User profile keywords
  if (userProfile.primary_focus_areas && Array.isArray(userProfile.primary_focus_areas)) {
    keywords.focus_areas = [...userProfile.primary_focus_areas]
    console.log('🎯 User focus areas:', keywords.focus_areas)
  }
  
  if (userProfile.populations_served && Array.isArray(userProfile.populations_served)) {
    keywords.populations = [...userProfile.populations_served]
    console.log('👥 User populations served:', keywords.populations)
  }
  
  if (userProfile.organization_type) {
    keywords.secondary.push(userProfile.organization_type.toLowerCase())
    console.log('🏢 Organization type:', userProfile.organization_type.toLowerCase())
    
    // Add organization-specific terms
    const orgMappings: { [key: string]: string[] } = {
      'nonprofit': ['community', 'social', 'charitable', 'public', 'service'],
      'for_profit': ['business', 'commercial', 'enterprise', 'market', 'revenue'],
      'government': ['public', 'municipal', 'federal', 'state', 'agency'],
      'academic': ['research', 'university', 'educational', 'scholarly', 'academic']
    }
    
    const orgTerms = orgMappings[userProfile.organization_type] || []
    keywords.secondary.push(...orgTerms)
    console.log('🏢 Organization-related terms:', orgTerms)
  }

  // Add industry/sector keywords if available
  if (userProfile.industry || userProfile.sector) {
    const industry = (userProfile.industry || userProfile.sector).toLowerCase()
    keywords.secondary.push(industry)
    keywords.secondary.push(...extractImportantWords(industry))
    console.log('🏭 Industry keywords:', industry)
  }

  // Clean and deduplicate all keywords
  keywords.primary = Array.from(new Set(keywords.primary.filter(k => k && k.length > 3)))
  keywords.secondary = Array.from(new Set(keywords.secondary.filter(k => k && k.length > 3)))
  keywords.focus_areas = Array.from(new Set(keywords.focus_areas.filter(k => k && k.length > 2)))
  keywords.populations = Array.from(new Set(keywords.populations.filter(k => k && k.length > 2)))
  
  console.log('✅ Final keyword extraction results:', {
    primaryCount: keywords.primary.length,
    secondaryCount: keywords.secondary.length,
    focusAreaCount: keywords.focus_areas.length,
    populationCount: keywords.populations.length,
    primarySample: keywords.primary.slice(0, 5),
    secondarySample: keywords.secondary.slice(0, 8)
  })
  
  return keywords
}

/**
 * Extract important words from text (remove common words)
 */
function extractImportantWords(text: string): string[] {
  if (!text) return []
  
  const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'some', 'any', 'all', 'each', 'every', 'other', 'another', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'now', 'here', 'there', 'where', 'when', 'why', 'how', 'what', 'who', 'which', 'whom', 'whose', 'about', 'above', 'after', 'again', 'against', 'before', 'being', 'below', 'between', 'both', 'during', 'each', 'from', 'further', 'into', 'more', 'most', 'off', 'once', 'over', 'same', 'through', 'under', 'until', 'up', 'while', 'also', 'many', 'much', 'well', 'good', 'great', 'best', 'better', 'make', 'made', 'making', 'work', 'working', 'works', 'help', 'helping', 'helps', 'provide', 'provides', 'providing', 'support', 'supporting', 'supports', 'include', 'includes', 'including']
  
  // High-value domain terms that should always be preserved
  const domainTerms = ['artificial', 'intelligence', 'machine', 'learning', 'healthcare', 'education', 'environment', 'sustainability', 'renewable', 'energy', 'housing', 'affordable', 'construction', 'building', 'research', 'development', 'innovation', 'technology', 'software', 'digital', 'nonprofit', 'profit', 'commercial', 'business', 'startup', 'entrepreneurship', 'manufacturing', 'agriculture', 'biotechnology', 'pharmaceuticals', 'medical', 'clinical', 'patient', 'therapeutic', 'diagnostic', 'community', 'social', 'economic', 'financial', 'infrastructure', 'transportation', 'logistics', 'supply', 'chain', 'cybersecurity', 'security', 'defense', 'aerospace', 'automotive', 'telecommunications', 'networking', 'database', 'analytics', 'science', 'engineering', 'materials', 'nanotechnology', 'robotics', 'automation', 'manufacturing', 'textiles', 'food', 'beverage', 'retail', 'hospitality', 'tourism', 'entertainment', 'media', 'publishing', 'gaming', 'sports', 'fitness', 'wellness', 'mental', 'health', 'elderly', 'seniors', 'children', 'youth', 'families', 'veterans', 'disabilities', 'minorities', 'women', 'indigenous', 'rural', 'urban', 'suburban', 'disaster', 'emergency', 'response', 'preparedness', 'climate', 'change', 'conservation', 'wildlife', 'forestry', 'marine', 'ocean', 'water', 'pollution', 'waste', 'recycling', 'circular', 'economy']
  
  // Enhanced word extraction with better filtering
  const words = text.toLowerCase()
    .replace(/[^\w\s'-]/g, ' ') // Keep apostrophes and hyphens
    .split(/\s+/) // Split on whitespace
    .filter(word => 
      word.length > 2 && 
      !stopWords.includes(word) &&
      !/^\d+$/.test(word) && // Remove pure numbers
      !/^[a-z]{1,2}$/.test(word) && // Remove short abbreviations
      !word.includes('http') // Remove URL fragments
    )
    .map(word => word.replace(/['-]$/, '')) // Clean trailing punctuation
    .filter(word => word.length > 2) // Re-filter after cleaning
  
  // Prioritize domain terms - they come first
  const domainWords = words.filter(word => domainTerms.includes(word))
  const otherWords = words.filter(word => !domainTerms.includes(word))
  
  // Combine with domain terms first, then other important words
  const result = [...domainWords, ...otherWords.slice(0, 15 - domainWords.length)]
  
  return result.slice(0, 20) // Limit to prevent too many keywords
}

/**
 * Check for hard stops that immediately disqualify
 */
function checkHardStops(opportunity: any, project: any, userProfile: any) {
  const reasons: string[] = []

  // Organization type check - BE STRICT
  const orgTypes = safeArrayField(opportunity.organization_types)
  if (orgTypes.length > 0) {
    if (userProfile.organization_type === 'unknown' || !userProfile.organization_type) {
      reasons.push('Organization type not specified - may not be eligible')
    } else if (!orgTypes.includes(userProfile.organization_type) && !orgTypes.includes('all')) {
      reasons.push(`${userProfile.organization_type} organizations not eligible - requires: ${orgTypes.join(', ')}`)
    }
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
    safeJoinField(opportunity.focus_areas),
    safeJoinField(opportunity.target_populations),
    safeJoinField(opportunity.eligibility_criteria),
    opportunity.application_process || '',
    safeJoinField(opportunity.required_documents),
    opportunity.sponsor || '',
    safeJoinField(opportunity.organization_types),
    safeJoinField(opportunity.project_types),
    opportunity.cfda_number || '',
    opportunity.source || ''
  ].join(' ').toLowerCase()

  let score = 0
  const strengths: string[] = []
  const weaknesses: string[] = []
  const matchedKeywords: string[] = []

  console.log('🔍 Keyword matching debug:', {
    opportunityTitle: opportunity.title,
    oppTextLength: oppText.length,
    oppTextPreview: oppText.substring(0, 200) + '...',
    primaryKeywords: keywords.primary,
    secondaryKeywords: keywords.secondary,
    focusAreas: keywords.focus_areas,
    populations: keywords.populations
  })

  // Check primary keywords (worth more)
  let primaryMatches = 0
  keywords.primary.forEach((keyword: string) => {
    if (oppText.includes(keyword.toLowerCase())) {
      score += 4
      matchedKeywords.push(keyword)
      primaryMatches++
      console.log(`✅ Primary keyword match: "${keyword}"`)
    }
  })

  // Check secondary keywords
  let secondaryMatches = 0
  keywords.secondary.forEach((keyword: string) => {
    if (oppText.includes(keyword.toLowerCase())) {
      score += 2
      matchedKeywords.push(keyword)
      secondaryMatches++
      console.log(`✅ Secondary keyword match: "${keyword}"`)
    }
  })

  // Check focus areas (high value)
  let focusMatches = 0
  keywords.focus_areas.forEach((area: string) => {
    if (oppText.includes(area.toLowerCase())) {
      score += 6
      matchedKeywords.push(area)
      focusMatches++
      console.log(`✅ Focus area match: "${area}"`)
    }
  })

  // Check populations (medium value)
  let popMatches = 0
  keywords.populations.forEach((pop: string) => {
    if (oppText.includes(pop.toLowerCase())) {
      score += 3
      matchedKeywords.push(pop)
      popMatches++
      console.log(`✅ Population match: "${pop}"`)
    }
  })

  // ENHANCED MATCHING: Check for semantic matches and partial matches
  // Check for technology-related terms if it's a tech project
  if (keywords.primary.some(k => ['technology', 'software', 'digital', 'ai', 'data'].includes(k.toLowerCase()))) {
    const techTerms = ['innovation', 'research', 'development', 'tech', 'stem', 'computer', 'automation', 'engineering']
    const techMatches = techTerms.filter(term => oppText.includes(term)).length
    if (techMatches > 0) {
      score += techMatches * 2
      matchedKeywords.push(...techTerms.filter(term => oppText.includes(term)))
      console.log(`✅ Tech semantic matches: ${techMatches}`)
    }
  }

  // Check for business development terms
  if (keywords.primary.some(k => ['business', 'commercial', 'startup', 'entrepreneur'].includes(k.toLowerCase()))) {
    const businessTerms = ['economic', 'growth', 'development', 'innovation', 'commercialization', 'market']
    const businessMatches = businessTerms.filter(term => oppText.includes(term)).length
    if (businessMatches > 0) {
      score += businessMatches * 2
      matchedKeywords.push(...businessTerms.filter(term => oppText.includes(term)))
      console.log(`✅ Business semantic matches: ${businessMatches}`)
    }
  }

  // THEMATIC MISMATCH PENALTY: Prevent completely unrelated matches
  // Check for major thematic mismatches that should heavily penalize the score
  const applyThematicMismatchPenalty = () => {
    const projectThemes = keywords.primary.concat(keywords.secondary).map(k => k.toLowerCase())
    const oppThemes = oppText.toLowerCase()
    
    // Define incompatible domain pairs
    const domainMismatches = [
      {
        projectDomains: ['housing', 'construction', 'affordable', 'residential', 'building'],
        oppDomains: ['humanities', 'research', 'academic', 'artificial intelligence', 'philosophy', 'literature', 'history']
      },
      {
        projectDomains: ['medical', 'health', 'healthcare', 'clinical', 'patient'],
        oppDomains: ['environmental', 'climate', 'conservation', 'wildlife', 'forestry']
      },
      {
        projectDomains: ['technology', 'software', 'digital', 'app', 'platform'],
        oppDomains: ['agriculture', 'farming', 'rural', 'livestock', 'crop']
      }
    ]
    
    for (const mismatch of domainMismatches) {
      const hasProjectDomain = mismatch.projectDomains.some(domain => 
        projectThemes.some(theme => theme.includes(domain))
      )
      const hasOppDomain = mismatch.oppDomains.some(domain => 
        oppThemes.includes(domain)
      )
      
      if (hasProjectDomain && hasOppDomain) {
        console.log(`⚠️ Major thematic mismatch detected: project has ${mismatch.projectDomains.filter(d => projectThemes.some(t => t.includes(d)))} but opportunity focuses on ${mismatch.oppDomains.filter(d => oppThemes.includes(d))}`)
        return -15 // Heavy penalty for major domain mismatch
      }
    }
    
    // Check for moderate mismatches (less severe)
    if (primaryMatches === 0 && secondaryMatches <= 1) {
      // If we have almost no thematic overlap, apply moderate penalty
      console.log(`⚠️ Weak thematic alignment: 0 primary matches, ${secondaryMatches} secondary matches`)
      return -5
    }
    
    return 0
  }
  
  const thematicPenalty = applyThematicMismatchPenalty()
  score += thematicPenalty
  if (thematicPenalty < 0) {
    weaknesses.push('Significant thematic mismatch between project focus and opportunity domain')
  }

  // Check for organization type alignment bonus
  const orgType = safeArrayField(opportunity.organization_types)
  const userOrgHints = keywords.secondary.filter(k => ['nonprofit', 'profit', 'business', 'government'].includes(k))
  if (userOrgHints.length > 0 && orgType.some(type => 
    userOrgHints.some(hint => type.toLowerCase().includes(hint) || hint.includes(type.toLowerCase()))
  )) {
    score += 5
    console.log(`✅ Organization type alignment bonus`)
  }

  // Cap at 40 points
  score = Math.min(score, 40)

  console.log('📊 Keyword matching results:', {
    totalScore: score,
    primaryMatches,
    secondaryMatches,
    focusMatches,
    popMatches,
    totalMatches: matchedKeywords.length
  })

  if (score >= 20) strengths.push(`Strong keyword alignment (${matchedKeywords.length} matches)`)
  else if (score >= 10) strengths.push(`Moderate keyword alignment (${matchedKeywords.length} matches)`)
  else weaknesses.push('Limited keyword alignment with project focus')

  return {
    score,
    strengths,
    weaknesses,
    details: {
      matchedKeywords: Array.from(new Set(matchedKeywords)).slice(0, 15), // Remove duplicates and limit
      totalMatches: matchedKeywords.length,
      scoreBreakdown: { 
        primary: primaryMatches, 
        secondary: secondaryMatches,
        focus: focusMatches,
        population: popMatches
      }
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

  const orgTypesEligible = safeArrayField(opportunity.organization_types)
  const userOrgType = userProfile.organization_type
  
  if (!orgTypesEligible.length || orgTypesEligible.includes('all')) {
    score = 15
    strengths.push('Open to all organization types')
  } else if (userOrgType && orgTypesEligible.includes(userOrgType)) {
    score = 20
    strengths.push(`${userOrgType} organizations explicitly eligible`)
  } else if (!userOrgType || userOrgType === 'unknown') {
    score = 0
    weaknesses.push('Organization type not specified - eligibility unclear')
  } else {
    score = 0
    weaknesses.push(`${userOrgType} organizations not eligible - requires: ${orgTypesEligible.join(', ')}`)
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
  
  // DUNS/UEI number (accept any of the common fields)
  if (userProfile.duns_uei_number || userProfile.duns_uei || userProfile.duns_number) score += 5
  
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
 * AI-powered analysis using hybrid provider with enhanced specificity
 */
async function aiAnalysisScoring(opportunity: any, project: any, userProfile: any) {
  // Create comprehensive context with all available data
  const opportunityContext = {
    title: opportunity.title || 'Untitled Opportunity',
    description: opportunity.description || opportunity.synopsis || '',
    source: opportunity.source || 'Unknown',
    sponsor: opportunity.sponsor || 'Unknown',
    focusAreas: safeArrayField(opportunity.focus_areas),
    targetPopulations: safeArrayField(opportunity.target_populations),
    organizationTypes: safeArrayField(opportunity.organization_types),
    eligibilityCriteria: safeArrayField(opportunity.eligibility_criteria),
    geographicRestrictions: safeArrayField(opportunity.geographic_restrictions),
    projectTypes: safeArrayField(opportunity.project_types),
    requirements: opportunity.requirements || opportunity.application_requirements || '',
    amountMin: opportunity.amount_min,
    amountMax: opportunity.amount_max,
    deadline: opportunity.deadline_date,
    cfda: opportunity.cfda_number,
    competitiveness: opportunity.competitiveness || 'Unknown'
  }

  const projectContext = {
    title: project.title || project.name || 'Untitled Project',
    description: project.description || '',
    category: project.project_category || project.category || '',
    requestAmount: project.funding_request_amount || project.total_project_budget,
    targetPopulation: project.target_population || project.target_population_description || '',
    primaryGoals: safeArrayField(project.primary_goals),
    expectedOutcomes: project.expected_outcomes || project.outcome_measures || '',
    uniqueInnovation: project.unique_innovation || project.innovation_description || '',
    methodology: project.methodology || project.approach || '',
    currentStatus: project.current_status || 'planning',
    timeline: project.timeline || '',
    team: project.team_description || '',
    partnerships: project.partnership_approach || ''
  }

  const orgContext = {
    type: userProfile.organization_type || 'unknown',
    name: userProfile.organization_name || 'Unknown Organization',
    role: userProfile.user_role || 'company',
    location: userProfile.state || userProfile.city || userProfile.location || 'Unknown',
    focusAreas: safeArrayField(userProfile.primary_service_areas || userProfile.primary_focus_areas),
    targetDemographics: safeArrayField(userProfile.target_demographics),
    annualBudget: userProfile.annual_budget || 'Not specified',
    yearsOperating: userProfile.years_in_operation || userProfile.years_operating || 'Unknown',
    grantExperience: userProfile.grant_experience || 'Unknown',
    largestGrant: userProfile.largest_grant || 'Unknown',
    staffSize: userProfile.full_time_staff || 'Unknown',
    certifications: {
      minorityOwned: userProfile.minority_owned,
      womanOwned: userProfile.woman_owned,
      veteranOwned: userProfile.veteran_owned,
      smallBusiness: userProfile.small_business,
      hubzone: userProfile.hubzone_certified,
      eightA: userProfile.eight_a_certified
    }
  }

  // Create very specific, detailed prompt focusing on this exact opportunity-project combination
  const prompt = `
GRANT FUNDING EXPERT ANALYSIS

Analyze this specific opportunity-project match with detailed, personalized insights:

==== FUNDING OPPORTUNITY DETAILS ====
Title: "${opportunityContext.title}"
Sponsor: ${opportunityContext.sponsor}
Source: ${opportunityContext.source}
CFDA Number: ${opportunityContext.cfda || 'N/A'}

Description/Synopsis: "${opportunityContext.description.substring(0, 1000)}${opportunityContext.description.length > 1000 ? '...' : ''}"

Funding Range: ${opportunityContext.amountMin ? `$${opportunityContext.amountMin.toLocaleString()}` : 'Not specified'} - ${opportunityContext.amountMax ? `$${opportunityContext.amountMax.toLocaleString()}` : 'Not specified'}
Application Deadline: ${opportunityContext.deadline || 'Not specified'}

Focus Areas: ${opportunityContext.focusAreas.length > 0 ? opportunityContext.focusAreas.join(', ') : 'Not specified'}
Eligible Org Types: ${opportunityContext.organizationTypes.length > 0 ? opportunityContext.organizationTypes.join(', ') : 'All types'}
Target Populations: ${opportunityContext.targetPopulations.length > 0 ? opportunityContext.targetPopulations.join(', ') : 'General'}
Geographic Restrictions: ${opportunityContext.geographicRestrictions.length > 0 ? opportunityContext.geographicRestrictions.join(', ') : 'None specified'}
Requirements: "${opportunityContext.requirements.substring(0, 500)}"

==== APPLICANT PROJECT DETAILS ====
Project Title: "${projectContext.title}"
Category: ${projectContext.category}
Description: "${projectContext.description.substring(0, 800)}${projectContext.description.length > 800 ? '...' : ''}"

Funding Request: ${projectContext.requestAmount ? `$${projectContext.requestAmount.toLocaleString()}` : 'Not specified'}
Target Population: ${projectContext.targetPopulation || 'Not specified'}
Current Status: ${projectContext.currentStatus}

Primary Goals: ${projectContext.primaryGoals.length > 0 ? projectContext.primaryGoals.join('; ') : 'Not specified'}
Expected Outcomes: "${projectContext.expectedOutcomes.substring(0, 300)}"
Unique Innovation: "${projectContext.uniqueInnovation.substring(0, 300)}"
Methodology/Approach: "${projectContext.methodology.substring(0, 300)}"

==== ORGANIZATION PROFILE ====
Organization: ${orgContext.name} (${orgContext.type})
Location: ${orgContext.location}
Contact Role: ${orgContext.role}
Years Operating: ${orgContext.yearsOperating}
Annual Budget Range: ${orgContext.annualBudget}
Staff Size: ${orgContext.staffSize}
Grant Experience: ${orgContext.grantExperience}
Largest Previous Grant: ${orgContext.largestGrant}

Organization Focus Areas: ${orgContext.focusAreas.length > 0 ? orgContext.focusAreas.join(', ') : 'Not specified'}
Target Demographics: ${orgContext.targetDemographics.length > 0 ? orgContext.targetDemographics.join(', ') : 'General population'}

Certifications: ${Object.entries(orgContext.certifications).filter(([_, value]) => value).map(([key, _]) => key).join(', ') || 'None'}

==== ANALYSIS REQUIREMENTS ====
You are a strict, objective funding analyst. DO NOT force matches or create false connections.

CRITICAL INSTRUCTIONS:
1. If there is NO clear alignment between the project and opportunity, score it low (0-30)
2. Do NOT assume organization type - use ONLY what is explicitly provided
3. If organization type is "unknown" or missing, factor this as a weakness
4. Be skeptical - only score high (70+) if there's genuine, specific alignment
5. Reference actual project details, not generic possibilities
6. If the project description is vague or doesn't match the opportunity focus, penalize the score heavily

OBJECTIVE EVALUATION CRITERIA:
- Project description must clearly relate to opportunity focus areas
- Organization type must match opportunity requirements (if specified)
- Funding amount must be reasonable for opportunity size
- Geographic requirements must be met
- Any missing information should reduce the score

Base your analysis ONLY on concrete facts provided. Do not infer, assume, or create connections that aren't explicitly evident.

Response Format (JSON only):
{
  "score": [0-100 integer based on realistic fit assessment],
  "strengths": [
    "[Specific strength 1 - reference actual project/opportunity details]",
    "[Specific strength 2 - reference actual alignment points]",
    "[Specific strength 3 - reference org capabilities that match requirements]"
  ],
  "weaknesses": [
    "[Specific concern 1 - identify actual gaps or mismatches]",
    "[Specific concern 2 - realistic challenges based on data provided]",
    "[Specific concern 3 - competitive or resource concerns]"
  ],
  "recommendations": [
    "[Specific action 1 - tailored to this opportunity's requirements]",
    "[Specific action 2 - address identified gaps]",
    "[Specific action 3 - leverage identified strengths]"
  ],
  "confidence": [0.0-1.0 based on data completeness and analysis clarity],
  "reasoning": "[2-3 sentences explaining the core rationale for the score, referencing specific opportunity and project details]"
}
`

  try {
    console.log('Enhanced AI Analysis - Generating detailed prompt for:', {
      opportunityTitle: opportunityContext.title,
      projectTitle: projectContext.title,
      orgName: orgContext.name,
      promptLength: prompt.length
    })

    const response = await aiProviderService.generateCompletion(
      'opportunity-analysis',
      [
        {
          role: 'system',
          content: 'You are a senior grant funding consultant with 15+ years of experience. Provide specific, detailed analysis based only on the provided information. Never use generic templates or vague language. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        maxTokens: 2000,
        temperature: 0.1, // Lower temperature for more consistent, factual analysis
        responseFormat: 'json_object'
      }
    )

    if (!response?.content) {
      throw new Error('No response from AI provider')
    }

    // Parse JSON response with enhanced validation
    const analysis = aiProviderService.safeParseJSON(response.content)
    
    console.log('Enhanced AI Analysis - Raw response:', {
      hasScore: typeof analysis.score === 'number',
      strengthsCount: Array.isArray(analysis.strengths) ? analysis.strengths.length : 0,
      weaknessesCount: Array.isArray(analysis.weaknesses) ? analysis.weaknesses.length : 0,
      recommendationsCount: Array.isArray(analysis.recommendations) ? analysis.recommendations.length : 0
    })
    
    // Validate and sanitize response
    if (typeof analysis.score !== 'number' || !Array.isArray(analysis.strengths) || analysis.strengths.length === 0) {
      console.warn('AI analysis returned invalid format, using fallback')
      throw new Error('Invalid AI response format')
    }

    // Check for generic responses that indicate poor analysis
    const combinedText = (analysis.strengths.join(' ') + ' ' + analysis.weaknesses.join(' ')).toLowerCase()
    const genericIndicators = [
      'aligns well with',
      'valuable tool for',
      'could be appealing',
      'demonstrates broad reach',
      'supports both for-profit and non-profit'
    ]
    
    const genericScore = genericIndicators.filter(indicator => combinedText.includes(indicator)).length
    if (genericScore >= 2) {
      console.warn('AI analysis appears to use generic language, regenerating...')
      // Could implement retry logic here
    }

    return {
      fitScore: Math.max(0, Math.min(100, analysis.score)),
      overallScore: Math.max(0, Math.min(100, analysis.score)),
      strengths: analysis.strengths.filter(s => typeof s === 'string' && s.length > 10) || ['Analysis completed'],
      challenges: analysis.weaknesses.filter(w => typeof w === 'string' && w.length > 10) || ['No specific challenges identified'],
      weaknesses: analysis.weaknesses.filter(w => typeof w === 'string' && w.length > 10) || ['No specific challenges identified'],
      recommendations: analysis.recommendations.filter(r => typeof r === 'string' && r.length > 10) || ['Continue with application process'],
      matchDetails: {
        confidence: Math.max(0, Math.min(1, analysis.confidence || 0.7)),
        reasoning: analysis.reasoning || 'AI analysis completed',
        processingTime: new Date().toISOString(),
        dataQuality: {
          opportunityComplete: !!(opportunityContext.title && opportunityContext.description),
          projectComplete: !!(projectContext.title && projectContext.description),
          orgComplete: !!(orgContext.name && orgContext.type)
        }
      },
      confidence: Math.max(0, Math.min(1, analysis.confidence || 0.7)),
      reasoning: analysis.reasoning || 'AI analysis completed'
    }

  } catch (error) {
    console.error('Enhanced AI analysis failed:', error)
    
    // Enhanced fallback with specific context
    const fallbackStrengths: string[] = []
    if (opportunityContext.organizationTypes.includes(orgContext.type)) {
      fallbackStrengths.push(`Organization type (${orgContext.type}) is eligible for this opportunity`)
    }
    if (projectContext.requestAmount && opportunityContext.amountMin && projectContext.requestAmount >= opportunityContext.amountMin) {
      fallbackStrengths.push(`Funding request amount aligns with opportunity minimum`)
    }
    if (opportunityContext.focusAreas.length > 0 && orgContext.focusAreas.some(area => 
      opportunityContext.focusAreas.some(oppArea => oppArea.toLowerCase().includes(area.toLowerCase()))
    )) {
      fallbackStrengths.push(`Organization focus areas align with opportunity priorities`)
    }
    if (fallbackStrengths.length === 0) {
      fallbackStrengths.push('Opportunity is accessible for application')
    }
    
    return {
      fitScore: 50,
      overallScore: 50,
      strengths: fallbackStrengths,
      challenges: ['Detailed AI analysis temporarily unavailable'],
      weaknesses: ['Detailed AI analysis temporarily unavailable'],
      recommendations: ['Manual review of opportunity requirements recommended', 'Consider consulting with grant writing expert'],
      matchDetails: {
        confidence: 0.4,
        reasoning: 'AI analysis failed, using basic compatibility assessment',
        processingTime: new Date().toISOString(),
        fallback: true
      },
      confidence: 0.4,
      reasoning: 'AI analysis failed, using basic compatibility assessment'
    }
  }
}

/**
 * Export for use in preScore route action
 */
async function aiAnalysis(opportunity: any, project: any, userProfile: any) {
  return await aiAnalysisScoring(opportunity, project, userProfile)
}