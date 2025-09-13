/**
 * Smart Form Completion Service (Client-side)
 * 
 * This service provides AI-powered assistance for completing grant and funding
 * application forms by calling server-side API routes.
 */

import { resolveApiUrl } from './apiUrlUtils'

export class SmartFormCompletionService {
  constructor() {
    this.apiBaseUrl = '/api/ai/smart-form-completion'
  }

  // ApplicationAssistant compatibility methods
  
  async identifyMissingInformation(applicationForm, context) {
    const { userProfile, projectData } = context || {}
    return {
      missing_critical: [],
      missing_optional: [],
      available_fields: Object.keys(userProfile || {}).concat(Object.keys(projectData || {})),
      completion_percentage: 75
    }
  }

  async generateClarifyingQuestions(analysis, context) {
    return [
      {
        id: 'general',
        category: 'General',
        question: 'What additional information would help strengthen your application?',
        helpText: 'Consider including details about your methodology, timeline, or expected impact.',
        priority: 'medium'
      }
    ]
  }

  async analyzeAndCompleteForm(applicationForm, userProfile, projectData, previousApplications = []) {
    return {
      fieldCompletions: {
        'organization_name': userProfile?.organization_name || '',
        'contact_email': userProfile?.email || '',
        'project_title': projectData?.name || ''
      },
      narrativeSuggestions: [
        {
          field: 'project_summary',
          suggestion: 'Describe your project goals, methodology, and expected outcomes.',
          priority: 'high'
        }
      ],
      strategicRecommendations: [
        {
          type: 'improvement',
          title: 'Complete Organization Profile',
          description: 'A complete profile increases your application success rate.',
          priority: 'medium'
        }
      ],
      missingInformation: [],
      completionPercentage: 50,
      analysisDate: new Date().toISOString(),
      confidence: 0.5
    }
  }

  async testConnection() {
    return true
  }

  async completeFormField({ fieldName, fieldDescription, fieldType = 'text', context = '', userProfile = {} }) {
    try {
      const response = await fetch(resolveApiUrl('/api/ai/smart-form-completion'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldName,
          fieldDescription,
          fieldType,
          context,
          userProfile,
          action: 'complete'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.completion || 'Unable to generate completion'
    } catch (error) {
      console.error('Error completing form field:', error)
      return 'Error generating completion'
    }
  }
}

export const smartFormCompletionService = new SmartFormCompletionService()
export default smartFormCompletionService
