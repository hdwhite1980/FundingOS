// lib/intelligentScoring.js
// Hybrid AI + Rule-based Scoring System

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

class IntelligentScoringService {
  constructor() {
    // Cost tracking
    this.costPerGPT4 = 0.03 // ~$0.03 per call
    this.costPerGPT35 = 0.002 // ~$0.002 per call
    this.monthlyCalls = 0
  }

  /**
   * TIER 1: Fast Rule-Based Pre-Scoring (FREE)
   * Eliminates obvious mismatches before AI analysis
   */
  async quickPreScore(opportunity, project, userProfile) {
    const preScore = {
      eligibleByRules: true,
      confidence: 'high', // high, medium, low
      quickScore: 0,
      flags: []
    }

    // Hard eligibility filters (instant rejection)
    if (opportunity.organization_types?.length > 0 && 
        !opportunity.organization_types.includes(userProfile.organization_type) && 
        !opportunity.organization_types.includes('all')) {
      preScore.eligibleByRules = false
      preScore.flags.push('organization_type_mismatch')
      return preScore
    }

    // Amount mismatch (instant rejection if way off)
    if (opportunity.amount_min && project.funding_need) {
      const ratio = project.funding_need / opportunity.amount_min
      if (ratio < 0.1 || ratio > 10) { // More than 10x difference
        preScore.eligibleByRules = false
        preScore.flags.push('amount_mismatch')
        return preScore
      }
    }

    // Deadline check (instant rejection if expired)
    if (opportunity.deadline_date) {
      const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) {
        preScore.eligibleByRules = false
        preScore.flags.push('expired')
        return preScore
      }
    }

    // Calculate confidence for AI analysis decision
    let confidenceScore = 100
    
    // EDGE CASES that reduce confidence and trigger AI analysis:
    
    // 🔍 Data Quality Issues
    if (!opportunity.description || opportunity.description.length < 100) {
      confidenceScore -= 30  // Poor description = need AI interpretation
    }
    if (!opportunity.keywords || opportunity.keywords.length === 0) {
      confidenceScore -= 20  // Missing keywords = need AI to extract meaning
    }
    
    // 🤖 AI-Discovered Opportunities  
    if (opportunity.source === 'ai-keyword') {
      confidenceScore -= 10  // AI-found might be edge case requiring analysis
    }
    
    // 📊 Complex Opportunity Types
    if (opportunity.type === 'contract' || opportunity.type === 'cooperative_agreement') {
      confidenceScore -= 15  // More complex than standard grants
    }
    
    // 💰 High-Value Opportunities
    if (opportunity.amount_max > 500000) {
      confidenceScore -= 15  // High stakes = need careful analysis
    }
    
    // 🏢 Organization Complexity
    if (opportunity.organization_types?.length > 3) {
      confidenceScore -= 10  // Multiple eligible org types = complex eligibility
    }
    
    // ⏰ Tight Deadlines
    if (opportunity.deadline_date) {
      const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 30) {
        confidenceScore -= 15  // Urgent deadlines need strategic analysis
      }
    }
    
    // 🎯 CONFIDENCE THRESHOLDS:
    // >= 80: HIGH confidence -> Skip AI (FREE)  
    // 60-79: MEDIUM confidence -> Use GPT-3.5 ($0.002)
    // < 60: LOW confidence -> Use GPT-4 ($0.03)
    
    if (confidenceScore >= 80) {
      preScore.confidence = 'high'
      preScore.quickScore = this.calculateRuleBasedScore(opportunity, project, userProfile)
    } else if (confidenceScore >= 60) {
      preScore.confidence = 'medium'  // Will use GPT-3.5
    } else {
      preScore.confidence = 'low'     // Will use GPT-4
    }

    return preScore
  }

  /**
   * TIER 2: Smart AI Analysis (SELECTIVE - only when needed)
   * Uses cheaper models for most analysis, GPT-4 for complex cases
   */
  async intelligentAnalysis(opportunity, project, userProfile, preScore) {
    this.monthlyCalls++
    
    // 🤖 SMART MODEL SELECTION - Choose AI model based on complexity
    const useGPT4 = (
      // LOW confidence cases (complex edge cases)
      preScore.confidence === 'low' || 
      
      // HIGH-STAKES opportunities (>$1M funding)
      opportunity.amount_max > 1000000 || 
      
      // HIGH-PRIORITY projects (user marked as important)  
      project.priority === 'high' ||
      
      // AI-DISCOVERED opportunities (might have subtle connections)
      opportunity.source === 'ai-keyword' ||
      
      // COMPETITIVE opportunities (need strategic analysis)
      opportunity.competition_level === 'highly_competitive' ||
      
      // COMPLEX grant types (contracts, cooperative agreements)
      opportunity.type === 'contract' || opportunity.type === 'cooperative_agreement' ||
      
      // TIGHT deadlines requiring strategic prioritization
      (() => {
        if (!opportunity.deadline_date) return false
        const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
        return daysLeft < 21 // Less than 3 weeks
      })()
    )
    
    const model = useGPT4 ? "gpt-4" : "gpt-3.5-turbo"
    const estimatedCost = useGPT4 ? this.costPerGPT4 : this.costPerGPT35
    
    console.log(`🤖 AI Analysis: ${model} (est. $${estimatedCost.toFixed(4)}) - Reason: ${useGPT4 ? 'Complex case' : 'Standard analysis'}`)

    const prompt = this.buildAnalysisPrompt(opportunity, project, userProfile, preScore)
    
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: this.getSystemPrompt(useGPT4) },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: useGPT4 ? 800 : 400
      })

      const analysis = JSON.parse(response.choices[0]?.message?.content)
      
      return {
        ...analysis,
        model_used: model,
        estimated_cost: estimatedCost,
        confidence: preScore.confidence
      }
      
    } catch (error) {
      console.error('AI Analysis failed, falling back to rules:', error)
      return {
        strategic_score: preScore.quickScore,
        reasoning: 'AI analysis failed, used rule-based scoring',
        confidence: 'fallback'
      }
    }
  }

  /**
   * TIER 3: Final Scoring Logic
   * Combines rule-based pre-scoring with selective AI insights
   */
  async getOpportunityScore(opportunity, project, userProfile) {
    // Step 1: Fast pre-screening
    const preScore = await this.quickPreScore(opportunity, project, userProfile)
    
    if (!preScore.eligibleByRules) {
      return {
        quick_match: 0,
        strategic_match: 0,
        reason: 'Eliminated by eligibility rules',
        flags: preScore.flags,
        cost: 0
      }
    }

    // Step 2: Decide if AI analysis is needed
    if (preScore.confidence === 'high') {
      // Skip AI - use rule-based score
      return {
        quick_match: preScore.quickScore,
        strategic_match: preScore.quickScore, // Align scores for consistency
        reason: 'High confidence rule-based match',
        confidence: 'high',
        cost: 0
      }
    }

    // Step 3: AI analysis for edge cases
    const aiAnalysis = await this.intelligentAnalysis(opportunity, project, userProfile, preScore)
    
    return {
      quick_match: preScore.quickScore,
      strategic_match: aiAnalysis.strategic_score,
      reason: aiAnalysis.reasoning,
      confidence: aiAnalysis.confidence,
      model_used: aiAnalysis.model_used,
      cost: aiAnalysis.estimated_cost
    }
  }

  // Rule-based scoring (existing logic, optimized)
  calculateRuleBasedScore(opportunity, project, userProfile) {
    let score = 0

    // Amount fit (25 points max)
    if (opportunity.amount_min && opportunity.amount_max && project.funding_need) {
      const need = project.funding_need
      if (need >= opportunity.amount_min && need <= opportunity.amount_max) {
        score += 25 // Perfect fit
      } else if (need <= opportunity.amount_max * 1.2) {
        score += 20 // Close fit
      } else if (need >= opportunity.amount_min * 0.8) {
        score += 15 // Reasonable fit
      } else {
        score += 5 // Some potential
      }
    } else {
      score += 15 // Unknown amounts get medium score
    }

    // Keyword/description matching (25 points max)
    const projectText = `${project.name} ${project.description}`.toLowerCase()
    const oppText = `${opportunity.title} ${opportunity.description}`.toLowerCase()
    
    let keywordScore = 0
    const commonWords = ['technology', 'innovation', 'research', 'education', 'community', 'development']
    
    for (const word of commonWords) {
      if (projectText.includes(word) && oppText.includes(word)) {
        keywordScore += 4
      }
    }
    score += Math.min(keywordScore, 25)

    // Organization type (20 points max)
    if (opportunity.organization_types?.includes(userProfile.organization_type)) {
      score += 20
    } else {
      score += 10 // Already passed pre-screening
    }

    // Timeline (15 points max)
    if (opportunity.deadline_date) {
      const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      if (daysLeft > 60) score += 15
      else if (daysLeft > 30) score += 12
      else if (daysLeft > 14) score += 10
      else score += 7
    } else {
      score += 12 // Rolling deadlines
    }

    // Geography (15 points max)
    if (opportunity.geography?.includes('nationwide')) {
      score += 15
    } else {
      score += 10 // Regional opportunities
    }

    return Math.min(score, 100)
  }

  getSystemPrompt(isGPT4) {
    if (isGPT4) {
      return `You are an expert grant strategist. Analyze opportunity-project fit with nuanced reasoning. 
      Consider: strategic alignment, competitive advantage, success probability, resource requirements.
      Return JSON: {"strategic_score": 0-100, "reasoning": "detailed explanation", "competitive_risk": "low/medium/high"}`
    } else {
      return `You are a funding match analyst. Score opportunity-project alignment concisely.
      Return JSON: {"strategic_score": 0-100, "reasoning": "brief explanation"}`
    }
  }

  buildAnalysisPrompt(opportunity, project, userProfile, preScore) {
    return `
OPPORTUNITY: ${opportunity.title}
Amount: $${opportunity.amount_min?.toLocaleString()} - $${opportunity.amount_max?.toLocaleString()}
Deadline: ${opportunity.deadline_date}
Description: ${opportunity.description?.substring(0, 500)}

PROJECT: ${project.name}
Need: $${project.funding_need?.toLocaleString()}
Description: ${project.description?.substring(0, 300)}

ORGANIZATION: ${userProfile.organization_type}
Previous success: ${userProfile.grants_awarded || 0} grants

PRE-SCORE: ${preScore.quickScore}/100 (${preScore.confidence} confidence)

Analyze strategic fit beyond basic eligibility.`
  }

  // Analytics
  getMonthlyCostEstimate() {
    return this.monthlyCalls * ((this.costPerGPT4 + this.costPerGPT35) / 2)
  }
}

export default new IntelligentScoringService()