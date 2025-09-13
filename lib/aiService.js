// lib/aiService.js - Client-side AI service using server-side API routes

// AI Service - Centralized AI functionality with proper URL resolution
import { resolveApiUrl } from './apiUrlUtils'

class AIService {
  
  // === UNIFIED AGENT AI CAPABILITIES ===
  
  static async generateUnifiedStrategy(userContext, situationAnalysis) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/agent/generate-strategy'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userContext,
          situationAnalysis
        })
      })

      if (!response.ok) {
        throw new Error(`Strategy generation failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Strategy generation error:', error)
      return this.generateFallbackStrategy(userContext, situationAnalysis)
    }
  }

  static generateFallbackStrategy(userContext, situationAnalysis) {
    return {
      strategy: 'Basic funding strategy (AI unavailable)',
      priority_actions: [
        'Review organizational capacity',
        'Identify key funding opportunities',
        'Prepare standard application materials'
      ],
      timeline: '3-6 months',
      confidence: 0.3,
      reasoning: 'Fallback strategy - full AI analysis unavailable'
    }
  }

  // === DOCUMENT ANALYSIS ===
  
  static async analyzeDocument(documentText, analysisType = 'grant_application') {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/document-analysis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: documentText,
          analysisType
        })
      })

      if (!response.ok) {
        throw new Error(`Document analysis failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Document analysis error:', error)
      return {
        summary: 'Document analysis unavailable',
        keyPoints: ['AI analysis failed'],
        recommendations: ['Manual review required'],
        confidence: 0.1
      }
    }
  }

  // === SMART FORM COMPLETION ===
  
  static async completeForm(formFields, companyData, projectData) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/smart-form-completion'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formFields,
          companyData,
          projectData
        })
      })

      if (!response.ok) {
        throw new Error(`Form completion failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Form completion error:', error)
      return {
        completedFields: {},
        confidence: 0.1,
        suggestedQuestions: ['AI form completion unavailable'],
        reasoning: 'AI service unavailable'
      }
    }
  }

  // === PROJECT CATEGORIZATION ===
  
  static async categorizeProject(projectDescription, organizationContext) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/categorize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectDescription,
          organizationContext,
          action: 'categorize'
        })
      })

      if (!response.ok) {
        throw new Error(`Project categorization failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Project categorization error:', error)
      return {
        category: 'general',
        subcategory: 'other',
        confidence: 0.1,
        reasoning: 'AI categorization unavailable'
      }
    }
  }

  // === OPPORTUNITY SCORING ===
  
  static async scoreOpportunity(opportunity, project, userProfile) {
    try {
      const resolvedUrl = resolveApiUrl('/api/ai/scoring')
      console.log('AIService: Calling scoring at', resolvedUrl)
      
      const response = await fetch(resolvedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunity,
          project,
          userProfile,
          action: 'score-opportunity'
        })
      })

      if (!response.ok) {
        throw new Error(`Opportunity scoring failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Opportunity scoring error:', error)
      return {
        score: 50,
        confidence: 0.2,
        reasoning: 'AI scoring unavailable'
      }
    }
  }

  // === UTILITY METHODS ===
  
  static formatUserContextForAI(userContext) {
    if (!userContext) return 'No user context provided'
    
    return `
Organization: ${userContext.organizationName || 'Unknown'}
Type: ${userContext.organizationType || 'Unknown'}
Focus Areas: ${userContext.focusAreas?.join(', ') || 'Not specified'}
Annual Budget: ${userContext.annualBudget || 'Not specified'}
Years Operating: ${userContext.yearsOperating || 'Not specified'}
`
  }

  static async testConnection() {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/document-analysis'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Test document for connection check',
          analysisType: 'test'
        })
      })

      return response.ok
    } catch (error) {
      console.error('AI service connection test failed:', error)
      return false
    }
  }

  // === LEGACY COMPATIBILITY METHODS ===
  // These methods provide compatibility with existing code that might call the old AI service
  
  static async categorizeProject_Legacy(projectText) {
    return await this.categorizeProject(projectText, {})
  }

  static async categorizeForFoundations(foundationPrompt, project, userProfile) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/categorize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foundationPrompt,
          project,
          userProfile,
          action: 'categorize-foundations'
        })
      })

      if (!response.ok) {
        throw new Error(`Foundation categorization failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Foundation categorization error:', error)
      return {
        categories: ['general'],
        confidence: 0.1,
        reasoning: 'Foundation categorization unavailable'
      }
    }
  }

  static async determineProjectCategories(project, userProfile) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/categorize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project,
          userProfile,
          action: 'determine-categories'
        })
      })

      if (!response.ok) {
        throw new Error(`Project categorization failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Project categorization error:', error)
      return {
        categories: ['general'],
        subcategories: ['other'],
        confidence: 0.1,
        reasoning: 'Project categorization unavailable'
      }
    }
  }

  static async categorizeForHealth(healthPrompt, project, userProfile) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/categorize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          healthPrompt,
          project,
          userProfile,
          action: 'categorize-health'
        })
      })

      if (!response.ok) {
        throw new Error(`Health categorization failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Health categorization error:', error)
      return {
        categories: ['health'],
        subcategories: ['general'],
        confidence: 0.1,
        reasoning: 'Health categorization unavailable'
      }
    }
  }

  static async categorizeForResearch(researchPrompt, project, userProfile) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/categorize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          researchPrompt,
          project,
          userProfile,
          action: 'categorize-research'
        })
      })

      if (!response.ok) {
        throw new Error(`Research categorization failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Research categorization error:', error)
      return {
        categories: ['research'],
        subcategories: ['general'],
        confidence: 0.1,
        reasoning: 'Research categorization unavailable'
      }
    }
  }

  static async categorizeForContracts(contractPrompt, project, userProfile) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/categorize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractPrompt,
          project,
          userProfile,
          action: 'categorize-contracts'
        })
      })

      if (!response.ok) {
        throw new Error(`Contract categorization failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Contract categorization error:', error)
      return {
        categories: ['contracts'],
        subcategories: ['general'],
        confidence: 0.1,
        reasoning: 'Contract categorization unavailable'
      }
    }
  }

  static async scoreOpportunityCompatibility(opportunity, project) {
    return await this.scoreOpportunity(opportunity, project, {})
  }

  static async analyzeOpportunityMatch(opportunity, organizationProfile) {
    try {
      // Create a minimal project object for the analysis
      const minimalProject = {
        name: 'Analysis Request',
        description: 'Opportunity compatibility analysis',
        funding_needed: 0,
        project_type: 'analysis',
        organization_type: organizationProfile?.organization_type || 'unknown'
      }

      const resolvedUrl = resolveApiUrl('/api/ai/enhanced-scoring')
      console.log('AIService: Calling enhanced scoring at', resolvedUrl)
      
      const response = await fetch(resolvedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opportunity,
          project: minimalProject,
          userProfile: organizationProfile,
          action: 'ai-analysis'
        })
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Opportunity analysis error:', error)
      return {
        compatibility: 50,
        strengths: ['Analysis unavailable'],
        concerns: ['AI service unavailable'],
        recommendations: ['Manual review recommended']
      }
    }
  }

  // === SERVICE STATUS ===
  
  // Legacy method for backward compatibility - redirects to scoring service
  static async analyzeOpportunityFit(userProfile, project, opportunity) {
    try {
      // Import the scoring service dynamically to avoid circular imports
      const { default: scoringService } = await import('./scoringServiceIntegration')
      return await scoringService.scoreOpportunity(opportunity, project, userProfile)
    } catch (error) {
      console.error('Legacy opportunity analysis error:', error)
      return {
        compatibility: 50,
        strengths: ['Analysis unavailable'],
        concerns: ['AI service unavailable'],
        recommendations: ['Manual review recommended']
      }
    }
  }
  
  static getServiceInfo() {
    return {
      name: 'AI Service (Client Wrapper)',
      version: '2.0.0',
      mode: 'API_ROUTES',
      capabilities: [
        'Document Analysis',
        'Form Completion', 
        'Project Categorization',
        'Opportunity Scoring',
        'Strategy Generation'
      ],
      endpoints: [
        '/api/ai/document-analysis',
        '/api/ai/smart-form-completion',
        '/api/ai/categorize',
        '/api/ai/scoring',
        '/api/ai/enhanced-scoring'
      ]
    }
  }
}

export default AIService