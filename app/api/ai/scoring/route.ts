/**
 * Scoring API Route
 * 
 * Server-side API endpoint for AI-powered opportunity scoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MAX_TOKENS = 3000
const MODEL = 'gpt-4-turbo-preview'

function safeParseResponse(content: string | null): any {
  if (!content) throw new Error('No content received from OpenAI')
  return JSON.parse(content)
}

export async function POST(request: NextRequest) {
  try {
    const { 
      opportunity,
      project,
      userProfile,
      action = 'score-opportunity' // score-opportunity, enhanced-score, batch-score
    } = await request.json()

    let result

    switch (action) {
      case 'score-opportunity':
        result = await scoreOpportunity(opportunity, project, userProfile)
        break
      case 'enhanced-score':
        result = await enhancedScoreOpportunity(opportunity, project, userProfile)
        break
      case 'batch-score':
        result = await batchScoreOpportunities(opportunity, project, userProfile)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('Scoring API error:', error)
    return NextResponse.json(
      { 
        error: 'Scoring failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function scoreOpportunity(opportunity: any, project: any, userProfile: any) {
  const prompt = `
As an expert funding analyst, score this opportunity for the given project and organization.

OPPORTUNITY:
${JSON.stringify(opportunity, null, 2)}

PROJECT:
${JSON.stringify(project, null, 2)}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

Provide a comprehensive scoring analysis with:
1. OVERALL_SCORE (0-100): Overall fit and probability of success
2. CATEGORY_SCORES: Break down scores for eligibility, alignment, competitiveness, etc.
3. STRENGTHS: What makes this a good fit
4. WEAKNESSES: Potential challenges or gaps
5. RECOMMENDATIONS: How to improve the application
6. CONFIDENCE: How confident you are in this scoring (0.0-1.0)

Format response as JSON with detailed explanations for each score.
  `

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert funding analyst with deep knowledge of grant evaluation criteria. Provide accurate, helpful scoring with clear rationale. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  })

  return safeParseResponse(response.choices[0].message.content)
}

async function enhancedScoreOpportunity(opportunity: any, project: any, userProfile: any) {
  const prompt = `
Perform enhanced multi-dimensional scoring for this funding opportunity.

OPPORTUNITY:
${JSON.stringify(opportunity, null, 2)}

PROJECT:
${JSON.stringify(project, null, 2)}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

Provide enhanced scoring with:
1. DIMENSIONAL_SCORES:
   - Eligibility Match (0-100)
   - Project Alignment (0-100) 
   - Organization Strength (0-100)
   - Competitive Positioning (0-100)
   - Resource Requirements (0-100)
   - Timeline Feasibility (0-100)
   - Impact Potential (0-100)

2. WEIGHTED_OVERALL_SCORE: Weighted composite score
3. RISK_ASSESSMENT: Detailed risk analysis
4. SUCCESS_PROBABILITY: Statistical likelihood of award
5. STRATEGIC_RECOMMENDATIONS: Specific improvement actions
6. COMPETITIVE_ANALYSIS: How you compare to likely competitors
7. APPLICATION_STRATEGY: Recommended approach for this specific opportunity

Format as comprehensive JSON analysis.
  `

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a senior funding strategy consultant with expertise in comprehensive opportunity analysis. Provide detailed, actionable scoring insights. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.2,
    response_format: { type: 'json_object' }
  })

  return safeParseResponse(response.choices[0].message.content)
}

async function batchScoreOpportunities(opportunities: any[], project: any, userProfile: any) {
  const scores: Array<{
    opportunityId: any;
    score?: any;
    error?: string;
    processed: boolean;
  }> = []
  
  for (const opportunity of opportunities.slice(0, 10)) { // Limit batch size
    try {
      const score = await scoreOpportunity(opportunity, project, userProfile)
      scores.push({
        opportunityId: opportunity.id,
        score: score,
        processed: true
      })
    } catch (error) {
      scores.push({
        opportunityId: opportunity.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: false
      })
    }
  }

  return {
    totalProcessed: scores.length,
    successful: scores.filter(s => s.processed).length,
    failed: scores.filter(s => !s.processed).length,
    scores: scores
  }
}