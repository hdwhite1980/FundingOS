// lib/scoringServiceIntegration.js
// Integration layer to gradually migrate to enhanced scoring while maintaining compatibility

import enhancedScoringService from './enhancedIntelligentScoring.js'
import originalScoringService from './intelligentScoring.js'

class ScoringServiceIntegration {
  constructor() {
    this.useEnhancedScoring = true // Feature flag to enable/disable enhanced scoring
    this.fallbackToOriginal = true // Fallback if enhanced scoring fails
  }

  /**
   * Main scoring method that routes to appropriate scoring service
   */
  async scoreOpportunity(opportunity, project, userProfile) {
    // Check if we have the enhanced data fields needed for comprehensive scoring
    const hasEnhancedUserData = this.hasEnhancedUserProfileData(userProfile)
    const hasEnhancedProjectData = this.hasEnhancedProjectData(project)

    if (this.useEnhancedScoring && (hasEnhancedUserData || hasEnhancedProjectData)) {
      try {
        console.log('🚀 Using enhanced scoring with comprehensive data analysis')
        const result = await enhancedScoringService.scoreOpportunity(opportunity, project, userProfile)
        
        // Add metadata about scoring method
        result.scoringMethod = 'enhanced'
        result.dataCompleteness = {
          userProfile: hasEnhancedUserData ? 'comprehensive' : 'basic',
          project: hasEnhancedProjectData ? 'comprehensive' : 'basic'
        }
        
        return result
      } catch (error) {
        console.error('Enhanced scoring failed, falling back to original:', error)
        
        if (this.fallbackToOriginal) {
          const result = await this.fallbackScoring(opportunity, project, userProfile)
          result.scoringMethod = 'fallback'
          result.enhancedScoringError = error.message
          return result
        } else {
          throw error
        }
      }
    } else {
      console.log('📊 Using original scoring (enhanced data not available)')
      const result = await this.fallbackScoring(opportunity, project, userProfile)
      result.scoringMethod = 'original'
      result.dataCompleteness = {
        userProfile: 'basic',
        project: 'basic'
      }
      return result
    }
  }

  /**
   * Check if user profile has enhanced onboarding data
   */
  hasEnhancedUserProfileData(userProfile) {
    const enhancedFields = [
      'ein', 'duns_uei', 'sam_registration', 'audit_status',
      'primary_focus_areas', 'populations_served', 'annual_budget',
      'years_operating', 'special_certifications', 'indirect_cost_rate'
    ]
    
    const presentFields = enhancedFields.filter(field => 
      userProfile[field] !== null && userProfile[field] !== undefined && userProfile[field] !== ''
    )
    
    // Consider enhanced if at least 50% of key fields are present
    return presentFields.length >= (enhancedFields.length * 0.5)
  }

  /**
   * Check if project has enhanced creation data
   */
  hasEnhancedProjectData(project) {
    const enhancedFields = [
      'project_category', 'target_population_description', 'estimated_people_served',
      'total_project_budget', 'funding_request_amount', 'current_status',
      'primary_goals', 'outcome_measures', 'unique_innovation', 'urgency_level'
    ]
    
    const presentFields = enhancedFields.filter(field => 
      project[field] !== null && project[field] !== undefined && project[field] !== ''
    )
    
    // Consider enhanced if at least 50% of key fields are present  
    return presentFields.length >= (enhancedFields.length * 0.5)
  }

  /**
   * Fallback to original scoring service
   */
  async fallbackScoring(opportunity, project, userProfile) {
    // Map new field names to old field names for compatibility
    const mappedProject = {
      ...project,
      funding_need: project.funding_request_amount || project.total_project_budget || project.funding_goal
    }

    const mappedUserProfile = {
      ...userProfile
    }

    if (originalScoringService && originalScoringService.scoreOpportunity) {
      return await originalScoringService.scoreOpportunity(opportunity, mappedProject, mappedUserProfile)
    } else {
      // Basic fallback scoring if original service not available
      return this.basicFallbackScore(opportunity, mappedProject, mappedUserProfile)
    }
  }

  /**
   * Very basic scoring as last resort
   */
  basicFallbackScore(opportunity, project, userProfile) {
    let score = 50 // Base score

    // Organization type match
    if (opportunity.organization_types?.includes(userProfile.organization_type)) {
      score += 20
    }

    // Budget range check
    const requestAmount = project.funding_need || project.total_project_budget
    if (requestAmount && opportunity.amount_min && opportunity.amount_max) {
      if (requestAmount >= opportunity.amount_min && requestAmount <= opportunity.amount_max) {
        score += 15
      }
    }

    // Deadline proximity
    if (opportunity.deadline_date) {
      const daysLeft = Math.ceil((new Date(opportunity.deadline_date) - new Date()) / (1000 * 60 * 60 * 24))
      if (daysLeft > 30) score += 10
      else if (daysLeft > 0) score += 5
    }

    return {
      finalScore: Math.min(score, 100),
      reasoning: 'Basic compatibility scoring',
      scoringMethod: 'basic_fallback'
    }
  }

  /**
   * Get scoring insights for display to users
   */
  getScoringInsights(scoringResult) {
    if (!scoringResult) return null

    const insights = {
      method: scoringResult.scoringMethod,
      dataQuality: scoringResult.dataCompleteness,
      strengths: [],
      improvements: []
    }

    // Enhanced scoring insights
    if (scoringResult.scoringMethod === 'enhanced') {
      if (scoringResult.complianceScore > 20) {
        insights.strengths.push('Strong compliance readiness')
      } else {
        insights.improvements.push('Complete compliance requirements (EIN, DUNS/UEI, SAM registration)')
      }

      if (scoringResult.readinessScore > 15) {
        insights.strengths.push('Project well-prepared for implementation')
      } else {
        insights.improvements.push('Strengthen project planning and staffing')
      }

      if (scoringResult.strategicFit > 15) {
        insights.strengths.push('Excellent strategic alignment')
      } else {
        insights.improvements.push('Improve alignment with organizational focus areas')
      }

      if (scoringResult.competitiveRisk === 'low') {
        insights.strengths.push('Lower competitive risk')
      }
    }

    // Basic scoring insights
    if (scoringResult.dataCompleteness?.userProfile === 'basic') {
      insights.improvements.push('Complete your organizational profile for better matching')
    }

    if (scoringResult.dataCompleteness?.project === 'basic') {
      insights.improvements.push('Add detailed project information for more accurate scoring')
    }

    return insights
  }
}

export default new ScoringServiceIntegration()