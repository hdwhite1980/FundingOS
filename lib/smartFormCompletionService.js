/**
 * Smart Form Completion Service (Client-side)
 * 
 * This service provides AI-powered assistance for completing grant and funding
 * application forms by calling server-side API routes.
 */

export class SmartFormCompletionService {
  constructor() {
    this.apiBaseUrl = '/api/ai/smart-form-completion'
  }

  /**
   * Analyze form fields and provide intelligent completions
   * @param {Object} formFields - Form field definitions and current values
   * @param {Object} userProfile - User's company/organization profile
   * @param {Object} projectData - Current project information
   * @returns {Object} Completion suggestions and filled values
   */
  async completeFormFields(formFields, userProfile, projectData) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formFields,
          userProfile,
          projectData,
          action: 'complete-form'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Form completion failed:', error)
      throw new Error(`Form completion failed: ${error.message}`)
    }
  }

  /**
   * Create a strategic completion plan for the application
   * @param {Object} formRequirements - Analysis of form requirements
   * @param {Object} context - User profile and project context
   * @returns {Object} Phased completion plan with priorities and timeline
   */
  async createCompletionPlan(formRequirements, context) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formFields: formRequirements,
          userProfile: context.userProfile,
          projectData: context.projectData,
          action: 'create-completion-plan'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Completion plan creation failed:', error)
      throw new Error(`Completion plan creation failed: ${error.message}`)
    }
  }

  /**
   * Generate narrative content for form sections
   * @param {Object} formFields - Form sections requiring narratives
   * @param {Object} userProfile - User's profile for personalization
   * @param {Object} projectData - Project details for context
   * @returns {Object} Generated narrative content with improvements
   */
  async generateNarrativeContent(formFields, userProfile, projectData) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formFields,
          userProfile,
          projectData,
          action: 'generate-narratives'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Narrative generation failed:', error)
      throw new Error(`Narrative generation failed: ${error.message}`)
    }
  }

  /**
   * Detect missing information for form completion
   * @param {Object} formFields - Required form fields
   * @param {Object} userProfile - Available user information
   * @param {Object} projectData - Available project information
   * @returns {Object} Analysis of missing information with priorities
   */
  async detectMissingInformation(formFields, userProfile, projectData) {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formFields,
          userProfile,
          projectData,
          action: 'detect-missing-info'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Missing information detection failed:', error)
      throw new Error(`Missing information detection failed: ${error.message}`)
    }
  }

  /**
   * Generate intelligent questions to gather missing information
   * @param {Object} missingInfo - Analysis of what information is missing
   * @param {Object} context - Additional context for better questions
   * @returns {Array} Prioritized list of questions to ask the user
   */
  async generateSmartQuestions(missingInfo, context = {}) {
    // Use the document analysis service for question generation
    try {
      const documentAnalysisResponse = await fetch('/api/ai/document-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: { formAnalysis: missingInfo, ...context },
          action: 'questions'
        })
      })

      if (!documentAnalysisResponse.ok) {
        const errorData = await documentAnalysisResponse.json()
        throw new Error(errorData.message || `HTTP error! status: ${documentAnalysisResponse.status}`)
      }

      const result = await documentAnalysisResponse.json()
      return result.data
    } catch (error) {
      console.error('Smart questions generation failed:', error)
      throw new Error(`Smart questions generation failed: ${error.message}`)
    }
  }

  /**
   * Validate form completion quality and suggest improvements
   * @param {Object} completedForm - The completed form data
   * @param {Object} originalRequirements - Original form requirements
   * @returns {Object} Quality assessment with improvement suggestions
   */
  async validateFormCompletion(completedForm, originalRequirements) {
    try {
      // For now, do basic client-side validation
      const validation = {
        completionScore: this.calculateCompletionScore(completedForm, originalRequirements),
        missingFields: this.identifyMissingFields(completedForm, originalRequirements),
        qualityIssues: this.identifyQualityIssues(completedForm),
        suggestions: this.generateImprovementSuggestions(completedForm),
        readinessLevel: 'draft' // draft, review-ready, submission-ready
      }

      // Determine readiness level
      if (validation.completionScore > 0.9 && validation.missingFields.length === 0) {
        validation.readinessLevel = 'submission-ready'
      } else if (validation.completionScore > 0.7 && validation.missingFields.length < 3) {
        validation.readinessLevel = 'review-ready'
      }

      return validation
    } catch (error) {
      console.error('Form validation failed:', error)
      throw new Error(`Form validation failed: ${error.message}`)
    }
  }

  /**
   * Calculate completion score based on filled fields and quality
   */
  calculateCompletionScore(completedForm, requirements) {
    if (!requirements || !completedForm) return 0

    const totalFields = Object.keys(requirements).length
    if (totalFields === 0) return 1

    let filledFields = 0
    let qualityScore = 0

    Object.entries(requirements).forEach(([fieldName, requirement]) => {
      const value = completedForm[fieldName]
      
      if (value && value.toString().trim() !== '') {
        filledFields++
        
        // Basic quality scoring
        if (requirement.minLength && value.length >= requirement.minLength) {
          qualityScore += 0.5
        }
        if (requirement.type === 'number' && !isNaN(value)) {
          qualityScore += 0.3
        }
        if (requirement.type === 'email' && this.isValidEmail(value)) {
          qualityScore += 0.3
        }
        if (value.length > 10) { // Reasonable content length
          qualityScore += 0.2
        }
      }
    })

    const completionRatio = filledFields / totalFields
    const qualityRatio = Math.min(qualityScore / totalFields, 1)
    
    return (completionRatio * 0.7) + (qualityRatio * 0.3)
  }

  /**
   * Identify missing required fields
   */
  identifyMissingFields(completedForm, requirements) {
    const missing = []
    
    Object.entries(requirements).forEach(([fieldName, requirement]) => {
      const value = completedForm[fieldName]
      
      if (requirement.required && (!value || value.toString().trim() === '')) {
        missing.push({
          field: fieldName,
          label: requirement.label || fieldName,
          type: requirement.type,
          priority: requirement.priority || 'medium'
        })
      }
    })

    return missing.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Identify potential quality issues
   */
  identifyQualityIssues(completedForm) {
    const issues = []

    Object.entries(completedForm).forEach(([fieldName, value]) => {
      if (!value || value.toString().trim() === '') return

      const valueStr = value.toString()

      // Check for overly short responses
      if (valueStr.length < 10 && fieldName.includes('description')) {
        issues.push({
          field: fieldName,
          type: 'too_short',
          message: 'Description appears too brief for a comprehensive response'
        })
      }

      // Check for placeholder text
      if (valueStr.toLowerCase().includes('lorem ipsum') || 
          valueStr.toLowerCase().includes('[placeholder]') ||
          valueStr.toLowerCase().includes('todo:')) {
        issues.push({
          field: fieldName,
          type: 'placeholder',
          message: 'Field contains placeholder text that needs to be replaced'
        })
      }

      // Check for repeated content
      const words = valueStr.split(' ')
      if (words.length > 5) {
        const uniqueWords = new Set(words.map(w => w.toLowerCase()))
        if (uniqueWords.size < words.length * 0.5) {
          issues.push({
            field: fieldName,
            type: 'repetitive',
            message: 'Content appears repetitive and may need revision'
          })
        }
      }
    })

    return issues
  }

  /**
   * Generate improvement suggestions
   */
  generateImprovementSuggestions(completedForm) {
    const suggestions = []

    Object.entries(completedForm).forEach(([fieldName, value]) => {
      if (!value) return

      const valueStr = value.toString()

      if (fieldName.toLowerCase().includes('budget') && !valueStr.match(/\$[\d,]+/)) {
        suggestions.push({
          field: fieldName,
          type: 'format',
          message: 'Consider including specific dollar amounts for budget items'
        })
      }

      if (fieldName.toLowerCase().includes('impact') && valueStr.length < 100) {
        suggestions.push({
          field: fieldName,
          type: 'expand',
          message: 'Impact statements are more compelling with specific metrics and outcomes'
        })
      }

      if (fieldName.toLowerCase().includes('timeline') && !valueStr.match(/\d+\s*(month|year|week|day)/i)) {
        suggestions.push({
          field: fieldName,
          type: 'detail',
          message: 'Include specific timeframes (months, years) for timeline clarity'
        })
      }
    })

    return suggestions
  }

  /**
   * Simple email validation helper
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Test API connectivity
   */
  async testConnection() {
    try {
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formFields: { test: 'Test field' },
          userProfile: { name: 'Test User' },
          projectData: { title: 'Test Project' },
          action: 'complete-form'
        })
      })

      return response.ok
    } catch (error) {
      console.error('API connection test failed:', error)
      return false
    }
  }
}

// Singleton instance for use across the application
export const smartFormCompletionService = new SmartFormCompletionService()
export default smartFormCompletionService