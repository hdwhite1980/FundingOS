// app/api/ai/enhanced-scoring/route.ts
// Enhanced AI scoring API route

import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is missing or empty')
    }

    const { opportunity, project, userProfile, action } = await request.json()

    if (!opportunity || !project || !userProfile) {
      return NextResponse.json(
        { error: 'Missing required parameters: opportunity, project, userProfile' },
        { status: 400 }
      )
    }

    let result;
    switch (action) {
      case 'enhanced-score':
        result = await enhancedScoring(opportunity, project, userProfile)
        break
      case 'pre-score':
        result = await preScoreAnalysis(opportunity, project, userProfile)
        break
      case 'ai-analysis':
        result = await aiAnalysis(opportunity, project, userProfile)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: enhanced-score, pre-score, ai-analysis' },
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
  // First do pre-scoring
  const preScore = await preScoreAnalysis(opportunity, project, userProfile)
  
  if (!preScore.eligibleByRules) {
    return {
      overallScore: 0,
      preScore,
      eligible: false,
      reasoning: 'Failed pre-screening criteria'
    }
  }

  // Then do AI analysis
  const aiAnalysis = await aiAnalysisScoring(opportunity, project, userProfile)
  
  // Combine rule-based and AI scores
  const finalScore = Math.round(
    (preScore.quickScore * 0.4) + 
    (aiAnalysis.score * 0.6)
  )

  return {
    overallScore: finalScore,
    preScore,
    aiAnalysis,
    eligible: true,
    categoryScores: {
      eligibility: preScore.complianceScore,
      alignment: preScore.strategicFit,
      feasibility: preScore.readinessScore,
      aiInsight: aiAnalysis.score
    },
    strengths: [...(preScore.strengths || []), ...(aiAnalysis.strengths || [])],
    weaknesses: [...(preScore.weaknesses || []), ...(aiAnalysis.weaknesses || [])],
    recommendations: [...(preScore.recommendations || []), ...(aiAnalysis.recommendations || [])],
    confidence: Math.min(preScore.confidence === 'high' ? 0.9 : 0.7, aiAnalysis.confidence || 0.8)
  }
}

/**
 * Enhanced rule-based pre-scoring
 */
async function preScoreAnalysis(opportunity: any, project: any, userProfile: any) {
  const preScore: any = {
    eligibleByRules: true,
    confidence: 'high' as const,
    quickScore: 0,
    flags: [] as string[],
    complianceScore: 0,
    strategicFit: 0,
    readinessScore: 0,
    strengths: [] as string[],
    weaknesses: [] as string[],
    recommendations: [] as string[]
  }

  // Organization type check
  if (opportunity.organization_types?.length > 0 && 
      !opportunity.organization_types.includes(userProfile.organization_type) && 
      !opportunity.organization_types.includes('all')) {
    preScore.eligibleByRules = false
    preScore.flags.push('organization_type_mismatch')
    preScore.weaknesses.push('Organization type not eligible for this opportunity')
    return preScore
  }

  // Budget alignment check
  const requestAmount = project.funding_request_amount || project.total_project_budget
  if (opportunity.amount_min && requestAmount) {
    const ratio = requestAmount / opportunity.amount_min
    if (ratio < 0.1 || ratio > 10) {
      preScore.eligibleByRules = false
      preScore.flags.push('amount_mismatch')
      preScore.weaknesses.push('Funding request amount not aligned with opportunity range')
      return preScore
    }
    if (ratio >= 0.5 && ratio <= 2.0) {
      preScore.quickScore += 15
      preScore.strengths.push('Good budget alignment')
    }
  }

  // Deadline check
  if (opportunity.deadline_date) {
    const daysLeft = Math.ceil((new Date(opportunity.deadline_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) {
      preScore.eligibleByRules = false
      preScore.flags.push('past_deadline')
      preScore.weaknesses.push('Application deadline has passed')
      return preScore
    }
    if (daysLeft > 30) {
      preScore.quickScore += 10
      preScore.strengths.push('Adequate time for application preparation')
    } else if (daysLeft > 0) {
      preScore.quickScore += 5
      preScore.weaknesses.push('Limited time remaining for application')
    }
  }

  // Enhanced compliance scoring
  preScore.complianceScore = calculateComplianceScore(userProfile)
  preScore.strategicFit = calculateStrategicFit(opportunity, project, userProfile)
  preScore.readinessScore = calculateReadinessScore(project)

  preScore.quickScore += preScore.complianceScore + preScore.strategicFit + preScore.readinessScore

  return preScore
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
 * AI-powered analysis using OpenAI
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
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert grant funding analyst. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Parse JSON response
    const analysis = JSON.parse(response)
    
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