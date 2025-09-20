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
        // Basic organization info
        'organization_name': userProfile?.organization_name || userProfile?.full_name || '',
        'contact_email': userProfile?.email || '',
        'project_title': projectData?.name || '',
        // Company/Organization details
        'tax_id': userProfile?.tax_id_ein || userProfile?.tax_id || userProfile?.ein || '',
        'ein': userProfile?.tax_id_ein || userProfile?.tax_id || userProfile?.ein || '',
        'tax_id_ein': userProfile?.tax_id_ein || userProfile?.tax_id || userProfile?.ein || '',
        'federal_tax_id': userProfile?.tax_id_ein || userProfile?.tax_id || userProfile?.ein || '',
        'employer_identification_number': userProfile?.tax_id_ein || userProfile?.tax_id || userProfile?.ein || '',
        'date_incorporated': userProfile?.date_incorporated || '',
        'incorporation_date': userProfile?.date_incorporated || '',
        'state_incorporated': userProfile?.state_incorporated || '',
        'incorporation_state': userProfile?.state_incorporated || '',
        'state_of_incorporation': userProfile?.state_incorporated || '',
        'duns_number': userProfile?.duns_uei_number || userProfile?.duns || '',
        'uei_number': userProfile?.duns_uei_number || userProfile?.uei || '',
        'duns_uei_number': userProfile?.duns_uei_number || '',
        'sam_gov_status': userProfile?.sam_gov_status || '',
        'grants_gov_status': userProfile?.grants_gov_status || '',
        // Contact details  
        'phone': userProfile?.phone || userProfile?.phone_number || '',
        'phone_number': userProfile?.phone || userProfile?.phone_number || '',
        // Address fields
        'address': userProfile?.address || '',
        'city': userProfile?.city || '',
        'state': userProfile?.state || '',
        'zip_code': userProfile?.zip_code || userProfile?.zip || '',
        'country': userProfile?.country || 'United States'
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
