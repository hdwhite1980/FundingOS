// lib/scoringServiceIntegration.js
// Integration layer for AI-powered scoring using server-side API routes

import { resolveApiUrl } from './apiUrlUtils'

class ScoringServiceIntegration {
  constructor() {
    this.apiBaseUrl = '/api/ai/enhanced-scoring' // Updated to use enhanced-scoring endpoint
    this.useEnhancedScoring = true // Feature flag to enable/disable enhanced scoring
    this.fallbackToOriginal = true // Fallback if enhanced scoring fails
  }

  /**
   * Main scoring method that routes to appropriate scoring service
   */
  async scoreOpportunity(opportunity, project, userProfile) {
    try {
      // Use fast-score by default for instant results
      if (this.useEnhancedScoring) {
        try {
          return await this.callScoringAPI({
            opportunity,
            project,
            userProfile,
            action: 'fast-score' // Changed from 'enhanced-score' to 'fast-score'
          })
        } catch (error) {
          console.warn('Fast scoring failed, falling back to basic scoring:', error)
          if (!this.fallbackToOriginal) throw error
        }
      }

      // Fallback to basic scoring
      return await this.callScoringAPI({
        opportunity,
        project,
        userProfile,
        action: 'enhanced-score' // Changed from 'score-opportunity' to 'enhanced-score'
      })

    } catch (error) {
      console.error('All scoring methods failed:', error)
      // Return a basic client-side score as ultimate fallback
      return this.generateBasicFallbackScore(opportunity, project, userProfile)
    }
  }

  /**
   * NEW: Get detailed AI analysis (on-demand only)
   */
  async getDetailedAnalysis(opportunity, project, userProfile) {
    try {
      return await this.callScoringAPI({
        opportunity,
        project,
        userProfile,
        action: 'enhanced-score' // Full AI analysis only when specifically requested
      })
    } catch (error) {
      console.error('Detailed AI analysis failed:', error)
      throw error
    }
  }

  /**
   * Call the scoring API
   */
  async callScoringAPI(payload) {
    const resolvedUrl = resolveApiUrl(this.apiBaseUrl)
    console.log('ScoringService: Calling API at', resolvedUrl)
    
    const response = await fetch(resolvedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    return result.data
  }

  /**
   * Generate a basic fallback score when API is unavailable
   */
  generateBasicFallbackScore(opportunity, project, userProfile) {
    // Basic rule-based scoring as fallback
    let score = 50 // Base score
    
    // Basic eligibility check
    if (opportunity?.eligibility && project?.category) {
      const eligibilityMatch = this.checkBasicEligibility(opportunity.eligibility, project)
      score += eligibilityMatch * 20
    }

    // Basic amount match
    if (opportunity?.fundingAmount && project?.budget) {
      const amountMatch = this.checkAmountAlignment(opportunity.fundingAmount, project.budget)
      score += amountMatch * 15
    }

    // Basic timeline check
    if (opportunity?.deadline) {
      const timelineScore = this.checkTimelineFeasibility(opportunity.deadline)
      score += timelineScore * 10
    }

    // Basic keyword matching
    if (opportunity?.description && project?.description) {
      const keywordMatch = this.calculateKeywordMatch(opportunity.description, project.description)
      score += keywordMatch * 15
    }

    return {
      overallScore: Math.min(Math.max(score, 0), 100),
      categoryScores: {
        eligibility: Math.min(score * 0.3, 30),
        alignment: Math.min(score * 0.25, 25),
        competitiveness: Math.min(score * 0.2, 20),
        feasibility: Math.min(score * 0.25, 25)
      },
      strengths: ['Basic compatibility analysis completed'],
      weaknesses: ['Detailed AI analysis unavailable'],
      recommendations: ['Full analysis requires server connection'],
      confidence: 0.3,
      isBasicScore: true,
      message: 'This is a simplified score. Full AI analysis unavailable.'
    }
  }

  /**
   * Basic eligibility checking
   */
  checkBasicEligibility(eligibility, project) {
    if (!eligibility || typeof eligibility !== 'string') return 0.5
    
    const eligibilityLower = eligibility.toLowerCase()
    const projectType = project?.type?.toLowerCase() || ''
    const projectCategory = project?.category?.toLowerCase() || ''
    
    // Simple keyword matching
    if (eligibilityLower.includes(projectType) || eligibilityLower.includes(projectCategory)) {
      return 1.0
    }
    if (eligibilityLower.includes('nonprofit') && project?.organizationType?.toLowerCase().includes('nonprofit')) {
      return 1.0
    }
    if (eligibilityLower.includes('research') && projectCategory.includes('research')) {
      return 1.0
    }
    
    return 0.5
  }

  /**
   * Basic amount alignment check
   */
  checkAmountAlignment(opportunityAmount, projectBudget) {
    if (!opportunityAmount || !projectBudget) return 0.5
    
    // Extract numbers from strings if needed
    const oppAmount = this.extractAmount(opportunityAmount)
    const projBudget = this.extractAmount(projectBudget)
    
    if (!oppAmount || !projBudget) return 0.5
    
    const ratio = Math.min(projBudget / oppAmount, oppAmount / projBudget)
    return Math.max(ratio - 0.5, 0) * 2 // Scale 0.5-1.0 to 0-1.0
  }

  /**
   * Extract numeric amount from string
   */
  extractAmount(amountStr) {
    if (typeof amountStr === 'number') return amountStr
    if (typeof amountStr !== 'string') return null
    
    const match = amountStr.match(/[\d,]+/)
    if (!match) return null
    
    return parseInt(match[0].replace(/,/g, ''))
  }

  /**
   * Check timeline feasibility
   */
  checkTimelineFeasibility(deadline) {
    if (!deadline) return 0.5
    
    const deadlineDate = new Date(deadline)
    const now = new Date()
    const daysUntilDeadline = (deadlineDate - now) / (1000 * 60 * 60 * 24)
    
    if (daysUntilDeadline < 0) return 0 // Past deadline
    if (daysUntilDeadline < 30) return 0.3 // Very tight
    if (daysUntilDeadline < 90) return 0.7 // Tight but doable
    return 1.0 // Plenty of time
  }

  /**
   * Calculate keyword match between descriptions
   */
  calculateKeywordMatch(oppDesc, projDesc) {
    if (!oppDesc || !projDesc) return 0.5
    
    const oppWords = oppDesc.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const projWords = projDesc.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    
    const commonWords = oppWords.filter(word => projWords.includes(word))
    const totalWords = new Set([...oppWords, ...projWords]).size
    
    return commonWords.length / Math.max(totalWords, 1)
  }

  /**
   * Score multiple opportunities
   */
  async scoreMultipleOpportunities(opportunities, project, userProfile) {
    try {
      return await this.callScoringAPI({
        opportunity: opportunities,
        project,
        userProfile,
        action: 'batch-score'
      })
    } catch (error) {
      console.error('Batch scoring failed, using sequential fallback:', error)
      
      // Sequential fallback
      const results = []
      for (const opp of opportunities.slice(0, 5)) { // Limit to prevent overwhelming
        try {
          const score = await this.scoreOpportunity(opp, project, userProfile)
          results.push({ opportunity: opp, score, success: true })
        } catch (err) {
          results.push({ opportunity: opp, error: err.message, success: false })
        }
      }
      
      return {
        totalProcessed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        scores: results
      }
    }
  }

  /**
   * Test scoring service connectivity
   */
  async testConnection() {
    try {
      const testOpportunity = {
        id: 'test',
        title: 'Test Opportunity',
        description: 'Test funding opportunity',
        fundingAmount: '$10,000',
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      }
      
      const testProject = {
        title: 'Test Project',
        description: 'Test project description',
        budget: 8000,
        category: 'research'
      }
      
      const testProfile = {
        organizationType: 'nonprofit',
        name: 'Test Organization'
      }
      
      await this.scoreOpportunity(testOpportunity, testProject, testProfile)
      return true
    } catch (error) {
      console.error('Scoring service connection test failed:', error)
      return false
    }
  }

  /**
   * Alias for scoreOpportunity to maintain backward compatibility
   */
  async calculateScore(project, opportunity, userProfile = null) {
    return await this.scoreOpportunity(opportunity, project, userProfile)
  }
}

// Create and export singleton instance
const scoringService = new ScoringServiceIntegration()
export default scoringService