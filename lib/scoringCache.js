// Scoring Cache Service - Manages cached opportunity scores
import { supabase, directUserServices } from './supabase'

export class ScoringCacheService {
  constructor() {
    this.scoringApiUrl = '/api/ai/enhanced-scoring'
  }

  /**
   * Get or calculate score for a project-opportunity match
   */
  async getOrCalculateScore(userId, projectId, opportunityId, forceRecalculate = false) {
    try {
      // First check if we have a cached score
      if (!forceRecalculate) {
        const cachedScore = await this.getCachedScore(userId, projectId, opportunityId)
        if (cachedScore && this.isScoreValid(cachedScore)) {
          console.log('Using cached score:', cachedScore.fit_score)
          return {
            score: cachedScore.fit_score,
            cached: true,
            analysis: cachedScore.ai_analysis,
            lastCalculated: cachedScore.score_calculated_at
          }
        }
      }

      // Calculate new score
      console.log('Calculating fresh score for project-opportunity match')
      const freshScore = await this.calculateScore(userId, projectId, opportunityId)
      
      // Cache the result
      if (freshScore) {
        await this.cacheScore(userId, projectId, opportunityId, freshScore)
      }

      return {
        score: freshScore?.overallScore || 0,
        cached: false,
        analysis: freshScore,
        lastCalculated: new Date().toISOString()
      }

    } catch (error) {
      console.error('getOrCalculateScore error:', error)
      return {
        score: 0,
        cached: false,
        error: error.message,
        lastCalculated: new Date().toISOString()
      }
    }
  }

  /**
   * Calculate score using enhanced scoring API
   */
  async calculateScore(userId, projectId, opportunityId) {
    try {
      // Get project data
      const projects = await directUserServices.projects.getProjects(userId)
      const project = projects.find(p => p.id === projectId)
      if (!project) {
        throw new Error('Project not found')
      }

      // Get opportunity data
      const opportunities = await directUserServices.opportunities.getOpportunities()
      const opportunity = opportunities.find(o => o.id === opportunityId)
      if (!opportunity) {
        throw new Error('Opportunity not found')
      }

      // Get user profile
      const userProfile = await directUserServices.profile.getOrCreateProfile(userId)

      // Call enhanced scoring API
      const response = await fetch(this.scoringApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunity,
          project,
          userProfile,
          action: 'enhanced-score' // Use full hybrid scoring
        })
      })

      if (!response.ok) {
        throw new Error(`Scoring API error: ${response.status}`)
      }

      const result = await response.json()
      return result.data

    } catch (error) {
      console.error('calculateScore error:', error)
      throw error
    }
  }

  /**
   * Get cached score from database
   */
  async getCachedScore(userId, projectId, opportunityId) {
    try {
      const { data, error } = await supabase
        .from('project_opportunities')
        .select('*')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .eq('opportunity_id', opportunityId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('getCachedScore error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('getCachedScore error:', error)
      return null
    }
  }

  /**
   * Cache score in database
   */
  async cacheScore(userId, projectId, opportunityId, scoreData) {
    try {
      const cacheData = {
        user_id: userId,
        project_id: projectId,
        opportunity_id: opportunityId,
        fit_score: scoreData.overallScore || 0,
        ai_analysis: scoreData,
        status: 'scored',
        score_calculated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      // Use upsert to handle existing records
      const { data, error } = await supabase
        .from('project_opportunities')
        .upsert([cacheData], {
          onConflict: 'user_id,project_id,opportunity_id'
        })
        .select()
        .single()

      if (error) {
        console.error('cacheScore error:', error)
        return null
      }

      console.log('Cached score successfully:', cacheData.fit_score)
      return data

    } catch (error) {
      console.error('cacheScore error:', error)
      return null
    }
  }

  /**
   * Check if cached score is still valid (not too old)
   */
  isScoreValid(cachedRecord) {
    if (!cachedRecord.score_calculated_at) {
      return false // No calculation date, consider invalid
    }

    const calculatedDate = new Date(cachedRecord.score_calculated_at)
    const now = new Date()
    const daysSinceCalculation = (now - calculatedDate) / (1000 * 60 * 60 * 24)

    // Consider scores valid for 7 days
    return daysSinceCalculation < 7
  }

  /**
   * Batch calculate scores for multiple opportunities
   */
  async batchCalculateScores(userId, projectId, opportunityIds, forceRecalculate = false) {
    console.log(`Batch calculating scores for ${opportunityIds.length} opportunities`)
    
    const results = []
    const batchSize = 5 // Process in small batches to avoid overwhelming the API

    for (let i = 0; i < opportunityIds.length; i += batchSize) {
      const batch = opportunityIds.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (opportunityId) => {
        try {
          const result = await this.getOrCalculateScore(userId, projectId, opportunityId, forceRecalculate)
          return {
            opportunityId,
            success: true,
            ...result
          }
        } catch (error) {
          console.error(`Batch scoring failed for opportunity ${opportunityId}:`, error)
          return {
            opportunityId,
            success: false,
            score: 0,
            error: error.message
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Brief delay between batches
      if (i + batchSize < opportunityIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }
  }

  /**
   * Get all cached scores for a project
   */
  async getProjectScores(userId, projectId) {
    try {
      const { data, error } = await supabase
        .from('project_opportunities')
        .select(`
          *,
          opportunities:opportunity_id (*)
        `)
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .order('fit_score', { ascending: false })

      if (error) {
        console.error('getProjectScores error:', error)
        return []
      }

      return (data || []).map(record => ({
        ...record,
        opportunity: record.opportunities,
        scoreAge: this.getScoreAge(record.score_calculated_at),
        isStale: !this.isScoreValid(record)
      }))

    } catch (error) {
      console.error('getProjectScores error:', error)
      return []
    }
  }

  /**
   * Calculate how old a score is
   */
  getScoreAge(calculatedAt) {
    if (!calculatedAt) return 'Unknown'
    
    const now = new Date()
    const calculated = new Date(calculatedAt)
    const diffMs = now - calculated
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  /**
   * Invalidate cached scores (force recalculation next time)
   */
  async invalidateProjectScores(userId, projectId) {
    try {
      const { error } = await supabase
        .from('project_opportunities')
        .update({ 
          score_calculated_at: null,
          status: 'needs_scoring'
        })
        .eq('user_id', userId)
        .eq('project_id', projectId)

      if (error) {
        console.error('invalidateProjectScores error:', error)
        return false
      }

      console.log('Invalidated cached scores for project:', projectId)
      return true

    } catch (error) {
      console.error('invalidateProjectScores error:', error)
      return false
    }
  }

  /**
   * Clean up old cached scores
   */
  async cleanupOldScores(daysOld = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { error } = await supabase
        .from('project_opportunities')
        .delete()
        .lt('score_calculated_at', cutoffDate.toISOString())
        .eq('status', 'scored')

      if (error) {
        console.error('cleanupOldScores error:', error)
        return false
      }

      console.log('Cleaned up cached scores older than', daysOld, 'days')
      return true

    } catch (error) {
      console.error('cleanupOldScores error:', error)
      return false
    }
  }
}

// Export singleton instance
const scoringCacheService = new ScoringCacheService()
export default scoringCacheService