// lib/enhancedIntelligentScoring.js
// Enhanced Hybrid AI + Rule-based Scoring System with Comprehensive Data Analysis

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

class EnhancedIntelligentScoringService {
  constructor() {
    this.costPerGPT4 = 0.03
    this.costPerGPT35 = 0.002
    this.monthlyCalls = 0
  }

  /**
   * ENHANCED TIER 1: Comprehensive Rule-Based Pre-Scoring with New Data Fields
   */
  async enhancedPreScore(opportunity, project, userProfile) {
    const preScore = {
      eligibleByRules: true,
      confidence: 'high',
      quickScore: 0,
      flags: [],
      complianceScore: 0,
      strategicFit: 0,
      readinessScore: 0
    }

    // ===========================================
    // HARD ELIGIBILITY FILTERS (Instant Rejection)
    // ===========================================
    
    // Organization type mismatch
    if (opportunity.organization_types?.length > 0 && 
        !opportunity.organization_types.includes(userProfile.organization_type) && 
        !opportunity.organization_types.includes('all')) {
      preScore.eligibleByRules = false
      preScore.flags.push('organization_type_mismatch')
      return preScore
    }

    // Budget mismatch (use new funding_request_amount field)
    const requestAmount = project.funding_request_amount || project.total_project_budget
    if (opportunity.amount_min && requestAmount) {
      const ratio = requestAmount / opportunity.amount_min
      if (ratio < 0.1 || ratio > 10) {
        preScore.eligibleByRules = false
        preScore.flags.push('amount_mismatch')
        return preScore
      }
    }

    // Expired deadline
    if (opportunity.deadline_date) {
      const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 0) {
        preScore.eligibleByRules = false
        preScore.flags.push('expired')
        return preScore
      }
    }

    // ===========================================
    // COMPLIANCE READINESS SCORING (30 points)
    // ===========================================
    let complianceScore = 0

    // Federal Grant Compliance (15 points max)
    if (opportunity.source === 'grants.gov' || opportunity.type === 'federal_grant') {
      // EIN/Tax ID (required) - 3 points
      if (userProfile.ein) complianceScore += 3

      // DUNS/UEI (required) - 4 points
      if (userProfile.duns_uei) complianceScore += 4

      // SAM Registration (required) - 4 points  
      if (userProfile.sam_registration === 'active' || userProfile.sam_registration === 'current') complianceScore += 4

      // Audit Status (important for >$750K awards) - 2 points
      if (userProfile.audit_status === 'single_audit_current' || userProfile.audit_status === 'single_audit_not_required') {
        complianceScore += 2
      }

      // Indirect Cost Rate (helpful) - 2 points
      if (userProfile.indirect_cost_rate && userProfile.indirect_rate_type) complianceScore += 2
    }

    // Foundation/Private Grant Compliance (10 points max)
    if (opportunity.source === 'foundation' || opportunity.type === 'foundation_grant') {
      // IRS Status (required) - 4 points
      if (userProfile.irs_status === '501c3_determination' || userProfile.irs_status === '501c3_pending') {
        complianceScore += 4
      }

      // Board Governance (important) - 3 points
      if (userProfile.board_diversity && userProfile.board_members >= 3) complianceScore += 3

      // Financial Transparency - 3 points
      if (userProfile.audit_status && userProfile.annual_budget) complianceScore += 3
    }

    // Special Certifications Bonus (5 points max)
    if (userProfile.special_certifications?.length > 0) {
      const relevantCerts = ['minority_owned', 'women_owned', 'veteran_owned', 'small_disadvantaged_business']
      const matchingCerts = userProfile.special_certifications.filter(cert => relevantCerts.includes(cert))
      complianceScore += Math.min(matchingCerts.length * 2, 5)
    }

    preScore.complianceScore = Math.min(complianceScore, 30)

    // ===========================================
    // PROJECT READINESS SCORING (25 points)
    // ===========================================
    let readinessScore = 0

    // Project Status (10 points max)
    if (project.current_status === 'planning_complete') readinessScore += 10
    else if (project.current_status === 'pilot_phase') readinessScore += 8
    else if (project.current_status === 'ongoing_sustainability') readinessScore += 6
    else readinessScore += 3 // conceptual stage

    // Staffing Readiness (8 points max)
    if (project.project_director_status === 'hired') readinessScore += 4
    else if (project.project_director_status === 'identified') readinessScore += 2

    if (project.key_staff_status === 'in_place') readinessScore += 4
    else if (project.key_staff_status === 'partially_staffed') readinessScore += 2

    // Partnership Readiness (4 points max)
    if (project.partnership_mous === 'in_place') readinessScore += 4
    else if (project.partnership_mous === 'in_progress') readinessScore += 2

    // Budget Detail (3 points max)
    const budgetPercentages = [
      project.personnel_percentage,
      project.equipment_percentage,
      project.travel_percentage,
      project.indirect_percentage,
      project.other_percentage
    ]
    const totalPercentage = budgetPercentages.reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    if (Math.abs(totalPercentage - 100) <= 1) readinessScore += 3 // Budget adds up correctly

    preScore.readinessScore = Math.min(readinessScore, 25)

    // ===========================================
    // STRATEGIC FIT SCORING (25 points)
    // ===========================================
    let strategicScore = 0

    // Focus Area Alignment (10 points max)
    if (userProfile.primary_focus_areas?.length > 0 && opportunity.focus_areas?.length > 0) {
      const intersection = userProfile.primary_focus_areas.filter(area => 
        opportunity.focus_areas.some(oppArea => oppArea.toLowerCase().includes(area.toLowerCase()))
      )
      strategicScore += Math.min(intersection.length * 3, 10)
    }

    // Population Served Match (8 points max)
    if (project.target_population_description && userProfile.populations_served?.length > 0) {
      const populationText = project.target_population_description.toLowerCase()
      const matches = userProfile.populations_served.filter(pop => 
        populationText.includes(pop.toLowerCase())
      )
      strategicScore += Math.min(matches.length * 2, 8)
    }

    // Geographic Alignment (4 points max)
    if (project.project_location && userProfile.geographic_service_area) {
      if (project.project_location.toLowerCase().includes(userProfile.geographic_service_area.toLowerCase())) {
        strategicScore += 4
      }
    }

    // Innovation & Differentiation (3 points max)
    if (project.unique_innovation && project.evidence_base) strategicScore += 3

    preScore.strategicFit = Math.min(strategicScore, 25)

    // ===========================================
    // TIMING & URGENCY SCORING (20 points)
    // ===========================================
    let timingScore = 0

    // Deadline urgency matching
    if (opportunity.deadline_date && project.urgency_level) {
      const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      
      if (project.urgency_level === 'urgent' && daysLeft < 60) timingScore += 8
      else if (project.urgency_level === 'high' && daysLeft < 120) timingScore += 6
      else if (project.urgency_level === 'medium' && daysLeft > 60) timingScore += 5
      else timingScore += 3
    }

    // Funding decision timeline match
    if (project.funding_decision_needed && opportunity.award_notification_date) {
      const projectNeedDate = new Date(project.funding_decision_needed)
      const awardDate = new Date(opportunity.award_notification_date)
      if (awardDate <= projectNeedDate) timingScore += 6
      else timingScore += 2
    }

    // Start date flexibility (6 points max)
    if (project.proposed_start_date && project.latest_useful_start) {
      const flexibility = Math.ceil((new Date(project.latest_useful_start) - new Date(project.proposed_start_date)) / (1000 * 60 * 60 * 24))
      if (flexibility > 180) timingScore += 6
      else if (flexibility > 90) timingScore += 4
      else if (flexibility > 30) timingScore += 2
    }

    const timingScore2 = Math.min(timingScore, 20)

    // ===========================================
    // FINAL SCORE CALCULATION
    // ===========================================
    preScore.quickScore = preScore.complianceScore + preScore.readinessScore + preScore.strategicFit + timingScore2

    // ===========================================
    // CONFIDENCE ASSESSMENT FOR AI ANALYSIS
    // ===========================================
    let confidenceScore = 100

    // Reduce confidence for edge cases requiring AI analysis
    if (!opportunity.description || opportunity.description.length < 100) confidenceScore -= 30
    if (!project.outcome_measures || !project.output_measures) confidenceScore -= 20
    if (opportunity.type === 'contract' || opportunity.type === 'cooperative_agreement') confidenceScore -= 15
    if (opportunity.amount_max > 1000000) confidenceScore -= 20 // Very high value
    if (!userProfile.previous_awards) confidenceScore -= 15 // No track record
    
    preScore.confidence = confidenceScore >= 80 ? 'high' : confidenceScore >= 60 ? 'medium' : 'low'

    return preScore
  }

  /**
   * ENHANCED TIER 2: AI Analysis with Comprehensive Context
   */
  async enhancedAIScore(opportunity, project, userProfile, preScore) {
    try {
      // Use GPT-4 for complex cases, GPT-3.5 for simpler ones
      const useGPT4 = preScore.quickScore > 60 || opportunity.amount_max > 500000 || preScore.confidence === 'low'
      const model = useGPT4 ? 'gpt-4' : 'gpt-3.5-turbo'

      const comprehensivePrompt = this.buildEnhancedPrompt(opportunity, project, userProfile, preScore)

      const response = await openai.chat.completions.create({
        model: model,
        messages: [{
          role: 'system',
          content: this.getEnhancedSystemPrompt(useGPT4)
        }, {
          role: 'user',
          content: comprehensivePrompt
        }],
        temperature: 0.3,
        max_tokens: 1000
      })

      const aiResult = JSON.parse(response.choices[0].message.content)
      
      // Combine rule-based pre-score with AI strategic analysis
      return {
        finalScore: Math.round((preScore.quickScore * 0.6) + (aiResult.strategic_score * 0.4)),
        complianceScore: preScore.complianceScore,
        readinessScore: preScore.readinessScore,
        strategicFit: preScore.strategicFit,
        aiStrategicScore: aiResult.strategic_score,
        reasoning: aiResult.reasoning,
        competitiveRisk: aiResult.competitive_risk,
        confidenceLevel: preScore.confidence,
        costUsed: useGPT4 ? this.costPerGPT4 : this.costPerGPT35
      }

    } catch (error) {
      console.error('Enhanced AI scoring failed:', error)
      return {
        finalScore: preScore.quickScore,
        complianceScore: preScore.complianceScore,
        readinessScore: preScore.readinessScore,
        strategicFit: preScore.strategicFit,
        reasoning: 'Rule-based scoring only (AI analysis failed)',
        confidenceLevel: 'medium'
      }
    }
  }

  buildEnhancedPrompt(opportunity, project, userProfile, preScore) {
    return `
COMPREHENSIVE GRANT OPPORTUNITY ANALYSIS

ORGANIZATION PROFILE:
- Type: ${userProfile.organization_type} (${userProfile.organization_type_other || 'N/A'})
- Years Operating: ${userProfile.years_operating || 'Unknown'}
- Annual Budget: $${userProfile.annual_budget?.toLocaleString() || 'Unknown'}
- Staff: ${userProfile.full_time_staff || 0} FT, ${userProfile.part_time_staff || 0} PT, ${userProfile.volunteers || 0} volunteers
- Focus Areas: ${userProfile.primary_focus_areas?.join(', ') || 'Not specified'}
- Populations Served: ${userProfile.populations_served?.join(', ') || 'Not specified'}
- Previous Awards: ${userProfile.previous_awards || 'None specified'}
- Compliance Status:
  * EIN: ${userProfile.ein ? 'Yes' : 'No'}
  * DUNS/UEI: ${userProfile.duns_uei ? 'Yes' : 'No'}
  * SAM Registration: ${userProfile.sam_registration || 'Unknown'}
  * Audit Status: ${userProfile.audit_status || 'Unknown'}
  * Special Certifications: ${userProfile.special_certifications?.join(', ') || 'None'}

PROJECT DETAILS:
- Category: ${project.project_category} (${project.project_category_other || 'N/A'})
- Total Budget: $${project.total_project_budget?.toLocaleString() || 'Unknown'}
- Funding Request: $${project.funding_request_amount?.toLocaleString() || 'Unknown'}
- People Served: ${project.estimated_people_served || 'Unknown'}
- Duration: ${project.project_duration || 'Unknown'}
- Status: ${project.current_status || 'Unknown'}
- Geographic Scope: ${project.project_location || 'Unknown'}
- Primary Goals: ${project.primary_goals?.join('; ') || 'Not specified'}
- Outcomes: ${project.outcome_measures || 'Not specified'}
- Innovation: ${project.unique_innovation || 'Not specified'}
- Evidence Base: ${project.evidence_base || 'Not specified'}
- Sustainability Plan: ${project.sustainability_plan || 'Not specified'}
- Urgency Level: ${project.urgency_level || 'Unknown'}

OPPORTUNITY DETAILS:
- Title: ${opportunity.title}
- Type: ${opportunity.type}
- Amount Range: $${opportunity.amount_min?.toLocaleString() || '0'} - $${opportunity.amount_max?.toLocaleString() || 'Unlimited'}
- Eligible Organizations: ${opportunity.organization_types?.join(', ') || 'All'}
- Focus Areas: ${opportunity.focus_areas?.join(', ') || 'General'}
- Description: ${opportunity.description?.substring(0, 500) || 'No description'}
- Deadline: ${opportunity.deadline_date || 'Rolling'}
- Source: ${opportunity.source || 'Unknown'}

RULE-BASED PRE-ANALYSIS:
- Compliance Score: ${preScore.complianceScore}/30
- Readiness Score: ${preScore.readinessScore}/25
- Strategic Fit: ${preScore.strategicFit}/25
- Pre-Score Total: ${preScore.quickScore}/100

ANALYSIS REQUIRED:
Please provide a comprehensive strategic assessment considering:
1. Competitive landscape and success probability
2. Resource requirements vs. organizational capacity
3. Strategic value beyond just funding amount
4. Risk factors and mitigation strategies
5. Alignment with long-term organizational goals
    `
  }

  getEnhancedSystemPrompt(isGPT4) {
    if (isGPT4) {
      return `You are an expert grant strategist with deep knowledge of federal, foundation, and private funding landscapes. 

Analyze the opportunity-project-organization fit with sophisticated reasoning considering:
- Competitive dynamics and success probability
- Strategic value beyond financial return
- Implementation feasibility and risk factors
- Long-term organizational impact
- Compliance and administrative burden

Return JSON with:
{
  "strategic_score": 0-100,
  "reasoning": "detailed strategic analysis with specific insights",
  "competitive_risk": "low/medium/high",
  "success_probability": "low/medium/high",
  "strategic_value": "low/medium/high",
  "key_strengths": ["strength1", "strength2", "strength3"],
  "risk_factors": ["risk1", "risk2"],
  "recommendations": "specific advice for pursuit strategy"
}`
    } else {
      return `You are a grant matching analyst. Provide focused strategic assessment.

Return JSON with:
{
  "strategic_score": 0-100,
  "reasoning": "concise strategic analysis",
  "competitive_risk": "low/medium/high",
  "success_probability": "medium/high"
}`
    }
  }

  /**
   * Main Scoring Interface - Enhanced Version
   */
  async scoreOpportunity(opportunity, project, userProfile) {
    // Step 1: Enhanced rule-based pre-scoring
    const preScore = await this.enhancedPreScore(opportunity, project, userProfile)
    
    if (!preScore.eligibleByRules) {
      return {
        finalScore: 0,
        reasoning: `Ineligible: ${preScore.flags.join(', ')}`,
        eligibleByRules: false
      }
    }

    // Step 2: Determine if AI analysis is needed
    if (preScore.confidence === 'high' && preScore.quickScore > 0) {
      return {
        finalScore: preScore.quickScore,
        complianceScore: preScore.complianceScore,
        readinessScore: preScore.readinessScore,
        strategicFit: preScore.strategicFit,
        reasoning: 'High-confidence rule-based match',
        eligibleByRules: true,
        method: 'rule_based_only'
      }
    }

    // Step 3: Enhanced AI analysis for complex cases
    return await this.enhancedAIScore(opportunity, project, userProfile, preScore)
  }
}

export default new EnhancedIntelligentScoringService()