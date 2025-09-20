/**
 * Form Completion Service - Coordinates all form completion functionality
 */

class FormCompletionService {
  constructor() {
    this.apiBaseUrl = '/api'
  }

  /**
   * Analyze a PDF form and extract its structure
   */
  async analyzePDFForm(file, context = {}) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', JSON.stringify(context))

      const response = await fetch(`${this.apiBaseUrl}/pdf/analyze`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`PDF analysis failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'PDF analysis failed')
      }

      return result.data
    } catch (error) {
      console.error('PDF analysis error:', error)
      throw error
    }
  }

  /**
   * Generate AI-powered walkthrough for form completion
   */
  async generateWalkthrough(formStructure, userProfile, projectData, companySettings) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/generate-walkthrough`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure,
          userProfile,
          projectData,
          companySettings
        })
      })

      if (!response.ok) {
        throw new Error(`Walkthrough generation failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Walkthrough generation failed')
      }

      return result.data
    } catch (error) {
      console.error('Walkthrough generation error:', error)
      throw error
    }
  }

  /**
   * Get AI assistance for answering specific fields
   */
  async getAIAssistance(field, question, userInput, projectData, userProfile, assistanceType = 'general', context = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai/assist-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          question,
          userInput,
          projectData,
          userProfile,
          assistanceType,
          context
        })
      })

      if (!response.ok) {
        throw new Error(`AI assistance failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'AI assistance failed')
      }

      return result.data.assistance
    } catch (error) {
      console.error('AI assistance error:', error)
      throw error
    }
  }

  /**
   * Export completed form in various formats
   */
  async exportForm(formStructure, completedData, format = 'pdf', options = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/form/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formStructure,
          completedData,
          exportFormat: format,
          options
        })
      })

      if (!response.ok) {
        throw new Error(`Form export failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Form export failed')
      }

      return result.data
    } catch (error) {
      console.error('Form export error:', error)
      throw error
    }
  }

  /**
   * Download exported form
   */
  downloadExportedForm(exportData) {
    try {
      const link = document.createElement('a')
      link.href = exportData.data
      link.download = exportData.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      return true
    } catch (error) {
      console.error('Download error:', error)
      throw error
    }
  }

  /**
   * Save form completion progress
   */
  async saveProgress(formId, completedData, metadata = {}) {
    try {
      // This would typically save to your backend database
      const progressData = {
        formId,
        completedData,
        metadata: {
          ...metadata,
          lastSaved: new Date().toISOString(),
          completion: this.calculateCompletion(completedData, metadata.totalFields)
        }
      }

      // For now, save to localStorage as fallback
      localStorage.setItem(`form_progress_${formId}`, JSON.stringify(progressData))
      
      return progressData
    } catch (error) {
      console.error('Save progress error:', error)
      throw error
    }
  }

  /**
   * Load saved form completion progress
   */
  loadProgress(formId) {
    try {
      const saved = localStorage.getItem(`form_progress_${formId}`)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error('Load progress error:', error)
      return null
    }
  }

  /**
   * Calculate completion percentage
   */
  calculateCompletion(completedData, totalFields) {
    if (!totalFields || totalFields === 0) return 0
    
    const completedFields = Object.keys(completedData).filter(
      key => completedData[key] && completedData[key].toString().trim() !== ''
    ).length
    
    return Math.round((completedFields / totalFields) * 100)
  }

  /**
   * Validate form data before export
   */
  validateFormData(formStructure, completedData) {
    const errors = []
    const warnings = []
    
    const fields = formStructure.fields || []
    
    fields.forEach(field => {
      const value = completedData[field.id]
      const isEmpty = !value || value.toString().trim() === ''
      
      // Check required fields
      if (field.required && isEmpty) {
        errors.push(`${field.label} is required but not completed`)
      }
      
      // Check field-specific validations
      if (value && field.validation) {
        // Email validation
        if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${field.label} must be a valid email address`)
        }
        
        // Phone validation
        if (field.type === 'phone' && !/^[\d\s\-\+\(\)]+$/.test(value)) {
          warnings.push(`${field.label} should be a valid phone number`)
        }
        
        // Word limit validation
        if (field.wordLimit) {
          const wordCount = value.split(' ').length
          if (wordCount > parseInt(field.wordLimit)) {
            warnings.push(`${field.label} exceeds word limit of ${field.wordLimit} (current: ${wordCount})`)
          }
        }
      }
      
      // Check for placeholder text that wasn't replaced
      if (value && typeof value === 'string') {
        if (value.includes('[INSERT') || value.includes('[ADD') || value.includes('[REPLACE')) {
          warnings.push(`${field.label} contains placeholder text that should be customized`)
        }
      }
    })
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completionRate: this.calculateCompletion(completedData, fields.length)
    }
  }

  /**
   * Generate field completion suggestions
   */
  generateCompletionSuggestions(formStructure, completedData, userProfile, projectData) {
    const suggestions = []
    const fields = formStructure.fields || []
    
    fields.forEach(field => {
      const value = completedData[field.id]
      const isEmpty = !value || value.toString().trim() === ''
      
      if (isEmpty) {
        let suggestion = null
        
        // Suggest auto-fill opportunities
        if (field.canAutoFill) {
          if (field.autoFillSource === 'organization' && userProfile?.organization_name) {
            suggestion = {
              type: 'auto_fill',
              field: field.id,
              label: field.label,
              suggestedValue: userProfile.organization_name,
              confidence: 0.9,
              source: 'User Profile'
            }
          } else if (field.autoFillSource === 'project' && projectData?.name) {
            suggestion = {
              type: 'auto_fill',
              field: field.id,
              label: field.label,
              suggestedValue: projectData.name,
              confidence: 0.8,
              source: 'Project Data'
            }
          }
        }
        
        // Suggest AI assistance for complex fields
        if (!suggestion && field.type === 'textarea') {
          suggestion = {
            type: 'ai_assistance',
            field: field.id,
            label: field.label,
            assistanceType: 'generate_draft',
            description: 'AI can generate a draft response based on your project information'
          }
        }
        
        // Suggest completion for high-priority fields
        if (!suggestion && field.required) {
          suggestion = {
            type: 'manual_completion',
            field: field.id,
            label: field.label,
            priority: 'high',
            description: 'This required field needs to be completed'
          }
        }
        
        if (suggestion) {
          suggestions.push(suggestion)
        }
      } else {
        // Suggest improvements for completed fields
        if (field.type === 'textarea' && value.length < 100) {
          suggestions.push({
            type: 'improvement',
            field: field.id,
            label: field.label,
            description: 'This response might benefit from more detail',
            assistanceType: 'suggest_improvements'
          })
        }
      }
    })
    
    // Sort suggestions by priority
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority] || 1
      const bPriority = priorityOrder[b.priority] || 1
      return bPriority - aPriority
    })
  }

  /**
   * Bulk apply auto-fill suggestions
   */
  applyAutoFillSuggestions(suggestions, completedData) {
    const updatedData = { ...completedData }
    let appliedCount = 0
    
    suggestions.forEach(suggestion => {
      if (suggestion.type === 'auto_fill' && suggestion.confidence > 0.7) {
        updatedData[suggestion.field] = suggestion.suggestedValue
        appliedCount++
      }
    })
    
    return {
      updatedData,
      appliedCount
    }
  }

  /**
   * Generate completion summary for review
   */
  generateCompletionSummary(formStructure, completedData, autoFillData = {}) {
    const fields = formStructure.fields || []
    const totalFields = fields.length
    const completedFields = Object.keys(completedData).filter(
      key => completedData[key] && completedData[key].toString().trim() !== ''
    ).length
    
    const requiredFields = fields.filter(f => f.required)
    const completedRequiredFields = requiredFields.filter(
      f => completedData[f.id] && completedData[f.id].toString().trim() !== ''
    ).length
    
    const autoFilledFields = autoFillData.autoFilled || []
    const manuallyCompletedFields = completedFields - autoFilledFields.length
    
    return {
      completion: {
        total: Math.round((completedFields / totalFields) * 100),
        required: Math.round((completedRequiredFields / requiredFields.length) * 100)
      },
      fields: {
        total: totalFields,
        completed: completedFields,
        required: requiredFields.length,
        completedRequired: completedRequiredFields,
        autoFilled: autoFilledFields.length,
        manuallyCompleted: manuallyCompletedFields
      },
      readiness: {
        canSubmit: completedRequiredFields === requiredFields.length,
        recommendedCompletion: 80, // Recommend 80% completion
        currentCompletion: Math.round((completedFields / totalFields) * 100)
      }
    }
  }
}

// Export singleton instance
const formCompletionService = new FormCompletionService()
export default formCompletionService

// Also export the class for testing
export { FormCompletionService }