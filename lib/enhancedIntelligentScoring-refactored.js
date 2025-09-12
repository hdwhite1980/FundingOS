// lib/enhancedIntelligentScoring.js
// Enhanced Hybrid AI + Rule-based Scoring System using server-side API

class EnhancedIntelligentScoringService {
  constructor() {
    this.apiBaseUrl = '/api/ai/enhanced-scoring'
    this.costPerRequest = 0.01 // Estimated cost per scoring request
    this.monthlyCalls = 0
  }

  /**
   * Main enhanced scoring method - calls server-side API
   */
  async scoreOpportunity(opportunity, project, userProfile) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunity,
          project,
          userProfile,
          action: 'enhanced-score'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      this.monthlyCalls++

      return {
        ...result.data,
        metadata: {
          scoringMethod: 'enhanced',
          apiCallsThisMonth: this.monthlyCalls,
          estimatedCost: this.monthlyCalls * this.costPerRequest,
          timestamp: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Enhanced scoring API failed:', error)
      
      // Fallback to basic client-side scoring
      return this.generateBasicFallbackScore(opportunity, project, userProfile, error.message)
    }
  }

  /**
   * Pre-scoring analysis only
   */
  async preScore(opportunity, project, userProfile) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunity,
          project,
          userProfile,
          action: 'pre-score'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data

    } catch (error) {
      console.error('Pre-scoring API failed:', error)
      
      // Fallback to basic rule-based scoring
      return this.generateBasicPreScore(opportunity, project, userProfile)
    }
  }

  /**
   * AI analysis only (without rule-based scoring)
   */
  async aiAnalysis(opportunity, project, userProfile) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunity,
          project,
          userProfile,
          action: 'ai-analysis'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data

    } catch (error) {
      console.error('AI analysis API failed:', error)
      
      // Return basic analysis
      return {
        score: 50,
        strengths: ['Basic analysis completed'],
        weaknesses: ['AI analysis unavailable'],
        recommendations: ['Manual review recommended'],
        confidence: 0.4,
        reasoning: 'AI analysis failed, using fallback'
      }
    }
  }

  /**
   * Generate basic fallback score when API is unavailable
   */
  generateBasicFallbackScore(opportunity, project, userProfile, errorMessage = 'API unavailable') {
    let score = 50 // Base score

    // Basic eligibility checks
    if (this.checkOrganizationType(opportunity, userProfile)) {
      score += 15
    } else {
      return {
        overallScore: 0,
        eligible: false,
        reasoning: 'Organization type not eligible',
        fallbackReason: errorMessage,
        categoryScores: { eligibility: 0, alignment: 0, feasibility: 0, aiInsight: 0 },
        strengths: [],
        weaknesses: ['Organization type not eligible for this opportunity'],
        recommendations: ['Find opportunities matching your organization type'],
        confidence: 0.9
      }
    }

    // Budget alignment
    const budgetScore = this.checkBudgetAlignment(opportunity, project)
    score += budgetScore

    // Timeline check
    const timelineScore = this.checkTimelineFeasibility(opportunity)
    score += timelineScore

    // Basic keyword matching
    const keywordScore = this.calculateBasicKeywordMatch(opportunity, project)
    score += keywordScore

    const finalScore = Math.min(Math.max(score, 0), 100)

    return {
      overallScore: finalScore,
      eligible: finalScore > 30,
      reasoning: 'Basic compatibility analysis (API fallback)',
      fallbackReason: errorMessage,
      categoryScores: {
        eligibility: Math.min(finalScore * 0.3, 30),
        alignment: Math.min(finalScore * 0.25, 25),
        feasibility: Math.min(finalScore * 0.25, 25),
        aiInsight: 0 // No AI insight in fallback
      },
      strengths: this.generateBasicStrengths(finalScore),
      weaknesses: this.generateBasicWeaknesses(finalScore),
      recommendations: this.generateBasicRecommendations(opportunity, project),
      confidence: 0.4, // Lower confidence for fallback scoring
      metadata: {
        scoringMethod: 'basic_fallback',
        reason: errorMessage,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Generate basic pre-score when API fails
   */
  generateBasicPreScore(opportunity, project, userProfile) {
    const preScore = {
      eligibleByRules: true,
      confidence: 'medium',
      quickScore: 50,
      flags: [],
      complianceScore: 10,
      strategicFit: 10,
      readinessScore: 10,
      strengths: [],
      weaknesses: [],
      recommendations: []
    }

    // Basic checks
    if (!this.checkOrganizationType(opportunity, userProfile)) {
      preScore.eligibleByRules = false
      preScore.flags.push('organization_type_mismatch')
      preScore.weaknesses.push('Organization type not eligible')
      return preScore
    }

    if (!this.checkBasicBudgetRange(opportunity, project)) {
      preScore.flags.push('potential_budget_mismatch')
      preScore.weaknesses.push('Budget may not align with opportunity range')
    }

    preScore.strengths.push('Basic eligibility requirements met')
    preScore.recommendations.push('Complete full analysis when server is available')

    return preScore
  }

  /**
   * Helper methods for basic scoring
   */
  checkOrganizationType(opportunity, userProfile) {
    if (!opportunity.organization_types?.length) return true
    return opportunity.organization_types.includes(userProfile.organization_type) || 
           opportunity.organization_types.includes('all')
  }

  checkBudgetAlignment(opportunity, project) {
    const requestAmount = project.funding_request_amount || project.total_project_budget
    if (!requestAmount || !opportunity.amount_min) return 5

    const ratio = requestAmount / opportunity.amount_min
    if (ratio >= 0.5 && ratio <= 2.0) return 15
    if (ratio >= 0.2 && ratio <= 5.0) return 10
    return 0
  }

  checkBasicBudgetRange(opportunity, project) {
    const requestAmount = project.funding_request_amount || project.total_project_budget
    if (!requestAmount || !opportunity.amount_min) return true

    const ratio = requestAmount / opportunity.amount_min
    return ratio >= 0.1 && ratio <= 10
  }

  checkTimelineFeasibility(opportunity) {
    if (!opportunity.deadline_date) return 5

    const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
    if (daysLeft < 0) return 0
    if (daysLeft > 30) return 10
    if (daysLeft > 7) return 7
    return 3
  }

  calculateBasicKeywordMatch(opportunity, project) {
    const oppText = (opportunity.title + ' ' + (opportunity.description || '')).toLowerCase()
    const projText = (project.title + ' ' + (project.description || '')).toLowerCase()
    
    const oppWords = oppText.split(/\s+/).filter(w => w.length > 3)
    const projWords = projText.split(/\s+/).filter(w => w.length > 3)
    
    const matches = oppWords.filter(word => projWords.some(pWord => pWord.includes(word) || word.includes(pWord)))
    
    return Math.min(matches.length * 2, 15)
  }

  generateBasicStrengths(score) {
    const strengths = []
    if (score > 70) strengths.push('Strong basic compatibility')
    else if (score > 50) strengths.push('Good basic compatibility')
    else strengths.push('Basic compatibility confirmed')
    
    strengths.push('Organization type eligible')
    return strengths
  }

  generateBasicWeaknesses(score) {
    const weaknesses = []
    if (score < 50) weaknesses.push('Limited compatibility in basic analysis')
    if (score < 30) weaknesses.push('Low basic compatibility score')
    
    weaknesses.push('Full AI analysis not available')
    return weaknesses
  }

  generateBasicRecommendations(opportunity, project) {
    const recommendations = [
      'Complete full enhanced scoring when server is available',
      'Review opportunity requirements carefully',
      'Ensure all project details are complete'
    ]

    if (opportunity.deadline_date) {
      const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      if (daysLeft < 30) {
        recommendations.unshift('Priority: Application deadline approaching')
      }
    }

    return recommendations
  }

  /**
   * Batch scoring for multiple opportunities
   */
  async scoreMultipleOpportunities(opportunities, project, userProfile) {
    const results = []
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 3
    for (let i = 0; i < opportunities.length; i += batchSize) {
      const batch = opportunities.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (opportunity) => {
        try {
          const score = await this.scoreOpportunity(opportunity, project, userProfile)
          return { opportunity, score, success: true }
        } catch (error) {
          console.error(`Scoring failed for opportunity ${opportunity.id}:`, error)
          return { 
            opportunity, 
            error: error.message, 
            success: false,
            fallbackScore: this.generateBasicFallbackScore(opportunity, project, userProfile, error.message)
          }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < opportunities.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return {
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      scores: results
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection() {
    try {
      const testOpportunity = {
        id: 'test',
        title: 'Test Opportunity',
        description: 'Test funding opportunity',
        amount_min: 10000,
        amount_max: 50000,
        organization_types: ['nonprofit'],
        deadline_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      }
      
      const testProject = {
        title: 'Test Project',
        description: 'Test project description',
        funding_request_amount: 25000,
        project_category: 'community'
      }
      
      const testProfile = {
        organization_type: 'nonprofit',
        name: 'Test Organization'
      }
      
      const result = await this.preScore(testOpportunity, testProject, testProfile)
      return result.eligibleByRules === true
    } catch (error) {
      console.error('Enhanced scoring API connection test failed:', error)
      return false
    }
  }

  /**
   * Get service status and statistics
   */
  getServiceStatus() {
    return {
      serviceName: 'Enhanced Intelligent Scoring',
      apiEndpoint: this.apiBaseUrl,
      callsThisSession: this.monthlyCalls,
      estimatedCost: this.monthlyCalls * this.costPerRequest,
      lastUpdated: new Date().toISOString(),
      features: [
        'Rule-based pre-scoring',
        'AI-powered analysis',
        'Comprehensive scoring',
        'Batch processing',
        'Fallback scoring'
      ]
    }
  }
}

// Export singleton instance
const enhancedScoringService = new EnhancedIntelligentScoringService()
export default enhancedScoringService