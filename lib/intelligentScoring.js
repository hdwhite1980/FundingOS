// lib/intelligentScoring.js
// Hybrid AI + Rule-based Scoring System using server-side API

class IntelligentScoringService {
  constructor() {
    this.apiBaseUrl = '/api/ai/enhanced-scoring' // Updated to use enhanced-scoring endpoint
    this.costPerRequest = 0.005 // Estimated cost per scoring request
    this.monthlyCalls = 0
  }

  /**
   * Main scoring method - routes to server-side API
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
          action: 'enhanced-score' // Changed from 'score-opportunity' to 'enhanced-score'
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
          scoringMethod: 'intelligent',
          apiCallsThisMonth: this.monthlyCalls,
          estimatedCost: this.monthlyCalls * this.costPerRequest,
          timestamp: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('Intelligent scoring API failed:', error)
      
      // Fallback to basic client-side scoring
      return this.generateBasicScore(opportunity, project, userProfile, error.message)
    }
  }

  /**
   * Fast rule-based pre-scoring
   */
  async quickPreScore(opportunity, project, userProfile) {
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
          action: 'pre-score' // This action is supported by enhanced-scoring endpoint
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data

    } catch (error) {
      console.error('Pre-scoring API failed:', error)
      
      // Fallback to basic pre-scoring
      return this.generateBasicPreScore(opportunity, project, userProfile)
    }
  }

  /**
   * Generate basic score when API is unavailable
   */
  generateBasicScore(opportunity, project, userProfile, errorMessage = 'API unavailable') {
    let score = 50 // Base score

    // Basic eligibility check
    if (!this.checkBasicEligibility(opportunity, userProfile)) {
      return {
        finalScore: 0,
        eligible: false,
        reasoning: 'Organization type not eligible',
        confidence: 0.9,
        fallbackReason: errorMessage
      }
    }

    // Budget alignment (simple check)
    if (this.checkBudgetRange(opportunity, project)) {
      score += 20
    }

    // Timeline check
    if (this.checkDeadline(opportunity)) {
      score += 15
    } else if (this.isPastDeadline(opportunity)) {
      return {
        finalScore: 0,
        eligible: false,
        reasoning: 'Application deadline has passed',
        confidence: 0.9,
        fallbackReason: errorMessage
      }
    }

    // Basic keyword matching
    score += this.calculateSimpleKeywordMatch(opportunity, project)

    const finalScore = Math.min(Math.max(score, 0), 100)

    return {
      finalScore,
      eligible: finalScore > 30,
      reasoning: 'Basic rule-based scoring (API fallback)',
      confidence: 0.4, // Lower confidence for fallback
      categoryScores: {
        eligibility: Math.min(finalScore * 0.4, 40),
        alignment: Math.min(finalScore * 0.3, 30),
        feasibility: Math.min(finalScore * 0.3, 30)
      },
      strengths: this.generateBasicStrengths(finalScore),
      concerns: this.generateBasicConcerns(finalScore),
      recommendations: ['Complete full AI analysis when server is available'],
      fallbackReason: errorMessage
    }
  }

  /**
   * Generate basic pre-score when API is unavailable
   */
  generateBasicPreScore(opportunity, project, userProfile) {
    const preScore = {
      eligibleByRules: true,
      confidence: 'medium',
      quickScore: 50,
      flags: []
    }

    // Basic eligibility checks
    if (!this.checkBasicEligibility(opportunity, userProfile)) {
      preScore.eligibleByRules = false
      preScore.confidence = 'high'
      preScore.quickScore = 0
      preScore.flags.push('organization_type_mismatch')
      return preScore
    }

    if (this.isPastDeadline(opportunity)) {
      preScore.eligibleByRules = false
      preScore.confidence = 'high'
      preScore.quickScore = 0
      preScore.flags.push('past_deadline')
      return preScore
    }

    // Basic scoring adjustments
    if (this.checkBudgetRange(opportunity, project)) {
      preScore.quickScore += 20
    } else {
      preScore.flags.push('budget_concern')
    }

    if (this.checkDeadline(opportunity)) {
      preScore.quickScore += 10
    } else {
      preScore.flags.push('tight_deadline')
    }

    return preScore
  }

  /**
   * Helper methods for basic scoring
   */
  checkBasicEligibility(opportunity, userProfile) {
    if (!opportunity.organization_types?.length) return true
    return opportunity.organization_types.includes(userProfile.organization_type) || 
           opportunity.organization_types.includes('all')
  }

  checkBudgetRange(opportunity, project) {
    const projectBudget = project.budget || project.funding_request_amount || project.total_project_budget
    if (!projectBudget || !opportunity.amount_min) return true

    const ratio = projectBudget / opportunity.amount_min
    return ratio >= 0.2 && ratio <= 5.0 // Reasonable range
  }

  checkDeadline(opportunity) {
    if (!opportunity.deadline_date) return true
    
    const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
    return daysLeft >= 30 // At least 30 days to apply
  }

  isPastDeadline(opportunity) {
    if (!opportunity.deadline_date) return false
    
    const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
    return daysLeft < 0
  }

  calculateSimpleKeywordMatch(opportunity, project) {
    const oppText = (opportunity.title + ' ' + (opportunity.description || '')).toLowerCase()
    const projText = (project.title + ' ' + (project.description || '')).toLowerCase()
    
    // Simple word overlap check
    const oppWords = oppText.split(/\s+/).filter(w => w.length > 3)
    const projWords = projText.split(/\s+/).filter(w => w.length > 3)
    
    let matches = 0
    oppWords.forEach(word => {
      if (projWords.some(pWord => pWord.includes(word) || word.includes(pWord))) {
        matches++
      }
    })
    
    return Math.min(matches * 2, 15) // Max 15 points from keyword matching
  }

  generateBasicStrengths(score) {
    if (score > 70) return ['Strong basic compatibility', 'Organization type eligible']
    if (score > 50) return ['Good basic compatibility', 'Meets basic eligibility']
    return ['Basic compatibility confirmed']
  }

  generateBasicConcerns(score) {
    if (score < 40) return ['Limited compatibility in basic analysis', 'May not meet all requirements']
    if (score < 60) return ['Some alignment concerns', 'Requires detailed review']
    return ['Full analysis needed for detailed assessment']
  }

  /**
   * Batch scoring for multiple opportunities
   */
  async scoreMultipleOpportunities(opportunities, project, userProfile) {
    const results = []
    const batchSize = 5 // Process in small batches
    
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
            fallbackScore: this.generateBasicScore(opportunity, project, userProfile, error.message)
          }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Brief delay between batches
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
        organization_types: ['nonprofit'],
        amount_min: 10000,
        deadline_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      }
      
      const testProject = {
        title: 'Test Project',
        description: 'Test project for connectivity check',
        budget: 15000
      }
      
      const testProfile = {
        organization_type: 'nonprofit'
      }
      
      const result = await this.quickPreScore(testOpportunity, testProject, testProfile)
      return result.eligibleByRules === true
    } catch (error) {
      console.error('Intelligent scoring API connection test failed:', error)
      return false
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      serviceName: 'Intelligent Scoring Service',
      apiEndpoint: this.apiBaseUrl,
      callsThisSession: this.monthlyCalls,
      estimatedCost: this.monthlyCalls * this.costPerRequest,
      features: [
        'Rule-based pre-scoring',
        'AI-enhanced scoring',
        'Batch processing',
        'Fallback scoring'
      ],
      lastUpdated: new Date().toISOString()
    }
  }
}

// Export singleton instance
const intelligentScoringService = new IntelligentScoringService()
export default intelligentScoringService