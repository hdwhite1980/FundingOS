/**
 * AI Walkthrough Generator API - Creates guided completion flow
 * /api/ai/generate-walkthrough
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import aiProviderService from '../../../lib/aiProviderService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { formStructure, userProfile, projectData, companySettings } = req.body

    if (!formStructure || !formStructure.fields) {
      return res.status(400).json({
        success: false,
        error: 'Form structure is required'
      })
    }

    console.log('🚀 Generating walkthrough for form:', {
      formTitle: formStructure.formTitle || 'Unknown',
      fieldsCount: formStructure.fields.length,
      sectionsCount: formStructure.sections?.length || 0,
      hasUserProfile: !!userProfile,
      hasProjectData: !!projectData
    })

    // Generate auto-fill suggestions
    const autoFillData = generateAutoFillSuggestions(
      formStructure.fields, 
      userProfile, 
      projectData, 
      companySettings
    )

    // Use AI to create intelligent walkthrough
    const walkthroughPrompt = buildWalkthroughPrompt(
      formStructure, 
      autoFillData, 
      userProfile, 
      projectData
    )
    
    const aiResponse = await aiProviderService.generateCompletion(
      'walkthrough-generation',
      [
        {
          role: 'system',
          content: walkthroughPrompt.system
        },
        {
          role: 'user',
          content: walkthroughPrompt.user
        }
      ],
      {
        temperature: 0.2,
        max_tokens: 8000,
        response_format: { type: 'json_object' }
      }
    )

    const responseContent = aiResponse?.content || aiResponse
    if (!responseContent) {
      throw new Error('No response from AI service')
    }

    let walkthroughResult
    try {
      // Clean and parse the AI response with robust JSON handling
      const cleanedResponse = cleanJsonResponse(String(responseContent))
      walkthroughResult = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('Failed to parse AI walkthrough response:', parseError)
      console.error('Raw AI response:', String(responseContent))
      
      // Attempt JSON repair as fallback
      try {
        const repairedJson = repairJsonResponse(String(responseContent))
        walkthroughResult = JSON.parse(repairedJson)
        console.log('✅ Successfully repaired and parsed JSON response')
      } catch (repairError) {
        console.error('JSON repair also failed:', repairError)
        throw new Error('Invalid AI response format - unable to parse or repair JSON')
      }
    }

    // Structure the complete walkthrough
    const completeWalkthrough = {
      success: true,
      data: {
        walkthrough: {
          id: `walkthrough_${Date.now()}`,
          formTitle: formStructure.formTitle || 'Application Form',
          totalSteps: walkthroughResult.steps?.length || 0,
          estimatedTime: walkthroughResult.estimatedTime || '30-60 minutes',
          completionStrategy: walkthroughResult.completionStrategy || 'guided',
          steps: walkthroughResult.steps || []
        },
        autoFillData: autoFillData,
        aiAssistance: {
          availableHelp: walkthroughResult.availableHelp || [],
          complexFields: walkthroughResult.complexFields || [],
          recommendations: walkthroughResult.recommendations || []
        },
        progress: {
          canAutoFill: autoFillData.autoFilled.length,
          needsInput: autoFillData.needsInput.length,
          requiresAI: walkthroughResult.requiresAI || 0,
          totalFields: formStructure.fields.length
        }
      }
    }

    console.log('✅ Walkthrough generated:', {
      steps: completeWalkthrough.data.walkthrough.totalSteps,
      autoFilled: completeWalkthrough.data.progress.canAutoFill,
      needsInput: completeWalkthrough.data.progress.needsInput,
      aiAssisted: completeWalkthrough.data.progress.requiresAI
    })

    return res.status(200).json(completeWalkthrough)

  } catch (error) {
    console.error('Walkthrough generation error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Walkthrough generation failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

function generateAutoFillSuggestions(fields: any[], userProfile: any, projectData: any, companySettings: any) {
  const autoFilled: string[] = []
  const needsInput: string[] = []
  const suggestions: any = {}

  fields.forEach(field => {
    const fieldId = field.id
    let autoFillValue = null
    let confidence = 0
    let source: string | null = null

    // Organization/Company auto-fill - Enhanced with more field types
    if (field.autoFillSource === 'organization' || 
        field.label?.toLowerCase().includes('organization') ||
        field.label?.toLowerCase().includes('company') ||
        field.label?.toLowerCase().includes('business')) {
      
      if (companySettings?.name && (field.label?.toLowerCase().includes('name') || field.label?.toLowerCase().includes('entity'))) {
        autoFillValue = companySettings.name
        confidence = 0.9
        source = 'company_settings'
      } else if (companySettings?.address && field.label?.toLowerCase().includes('address')) {
        autoFillValue = companySettings.address
        confidence = 0.85
        source = 'company_settings'
      } else if (companySettings?.phone && (field.type === 'phone' || field.label?.toLowerCase().includes('phone'))) {
        autoFillValue = companySettings.phone
        confidence = 0.8
        source = 'company_settings'
      } else if (companySettings?.email && (field.type === 'email' || field.label?.toLowerCase().includes('email'))) {
        autoFillValue = companySettings.email
        confidence = 0.8
        source = 'company_settings'
      } else if (companySettings?.ein && (field.label?.toLowerCase().includes('ein') || field.label?.toLowerCase().includes('tax'))) {
        autoFillValue = companySettings.ein
        confidence = 0.95
        source = 'company_settings'
      } else if (companySettings?.duns && field.label?.toLowerCase().includes('duns')) {
        autoFillValue = companySettings.duns
        confidence = 0.95
        source = 'company_settings'
      }
    }

    // Enhanced User profile auto-fill
    if (!autoFillValue && userProfile) {
      const fieldLabel = field.label?.toLowerCase() || ''
      
      if (fieldLabel.includes('contact') || fieldLabel.includes('name')) {
        if (userProfile.full_name && fieldLabel.includes('name')) {
          autoFillValue = userProfile.full_name
          confidence = 0.85
          source = 'user_profile'
        } else if (userProfile.email && (field.type === 'email' || fieldLabel.includes('email'))) {
          autoFillValue = userProfile.email
          confidence = 0.9
          source = 'user_profile'
        } else if (userProfile.phone && (field.type === 'phone' || fieldLabel.includes('phone'))) {
          autoFillValue = userProfile.phone
          confidence = 0.85
          source = 'user_profile'
        }
      } else if (fieldLabel.includes('title') && userProfile.title) {
        autoFillValue = userProfile.title
        confidence = 0.8
        source = 'user_profile'
      } else if (fieldLabel.includes('department') && userProfile.department) {
        autoFillValue = userProfile.department
        confidence = 0.8
        source = 'user_profile'
      }
    }

    // Enhanced Project data auto-fill
    if (!autoFillValue && projectData) {
      const fieldLabel = field.label?.toLowerCase() || ''
      
      if (fieldLabel.includes('project') && projectData.name) {
        autoFillValue = projectData.name
        confidence = 0.9
        source = 'project_data'
      } else if ((fieldLabel.includes('amount') || fieldLabel.includes('budget') || fieldLabel.includes('funding') || field.type === 'currency') && projectData.funding_needed) {
        autoFillValue = projectData.funding_needed
        confidence = 0.8
        source = 'project_data'
      } else if (fieldLabel.includes('description') && projectData.description) {
        autoFillValue = projectData.description
        confidence = 0.7
        source = 'project_data'
      } else if (fieldLabel.includes('title') && projectData.name) {
        autoFillValue = projectData.name
        confidence = 0.85
        source = 'project_data'
      } else if (fieldLabel.includes('category') && projectData.project_type) {
        autoFillValue = projectData.project_type.replace('_', ' ')
        confidence = 0.8
        source = 'project_data'
      } else if (fieldLabel.includes('location') && projectData.location) {
        autoFillValue = projectData.location
        confidence = 0.8
        source = 'project_data'
      } else if ((fieldLabel.includes('start') || fieldLabel.includes('begin')) && projectData.start_date) {
        autoFillValue = projectData.start_date
        confidence = 0.8
        source = 'project_data'
      } else if ((fieldLabel.includes('end') || fieldLabel.includes('completion')) && projectData.end_date) {
        autoFillValue = projectData.end_date
        confidence = 0.8
        source = 'project_data'
      }
    }

    if (autoFillValue && confidence > 0.6) {
      autoFilled.push(fieldId)
      suggestions[fieldId] = {
        value: autoFillValue,
        confidence,
        source,
        editable: true
      }
    } else {
      needsInput.push(fieldId)
    }
  })

  return {
    autoFilled,
    needsInput,
    suggestions
  }
}

function buildWalkthroughPrompt(formStructure: any, autoFillData: any, userProfile: any, projectData: any) {
  return {
    system: `You are an expert form completion strategist who creates intelligent, step-by-step walkthroughs for complex application forms.

Your goal is to create a guided completion experience that:
- Groups related fields logically
- Minimizes cognitive load 
- Provides AI assistance where needed
- Optimizes the completion flow
- Identifies fields that need special attention

You have access to:
- Complete form structure with all fields and sections
- Auto-fill capabilities for organization, user, and project data
- AI assistance for complex narrative questions
- User context to personalize the experience

Return a JSON walkthrough with this structure:

{
  "estimatedTime": "30-60 minutes",
  "completionStrategy": "guided|sequential|section_based",
  "steps": [
    {
      "id": "step_1",
      "title": "Step Title",
      "description": "What the user will do in this step",
      "type": "auto_fill|input_required|ai_assisted|review",
      "fields": ["field_1", "field_2"],
      "estimatedTime": "5-10 minutes",
      "instructions": "Specific instructions for this step",
      "aiHelp": {
        "available": true|false,
        "type": "writing_assistance|data_analysis|formatting_help",
        "description": "What AI can help with"
      },
      "validation": ["requirements to check before proceeding"]
    }
  ],
  "availableHelp": [
    {
      "type": "writing_assistant|data_validator|completion_checker",
      "description": "What this help provides",
      "applicableFields": ["field_ids where this help is useful"]
    }
  ],
  "complexFields": [
    {
      "fieldId": "field_id",
      "reason": "Why this field is complex",
      "aiStrategy": "How AI can help complete it",
      "userGuidance": "Instructions for the user"
    }
  ],
  "recommendations": [
    "Prepare X documents before starting",
    "Review Y information from your project",
    "Consider Z when answering narrative questions"
  ],
  "requiresAI": 5
}`,

    user: `Create an intelligent walkthrough for this form completion:

FORM STRUCTURE:
${JSON.stringify(formStructure, null, 2)}

AUTO-FILL CAPABILITIES:
- Can auto-fill: ${autoFillData.autoFilled.length} fields
- Needs user input: ${autoFillData.needsInput.length} fields
- Available data sources: ${Object.keys(autoFillData.suggestions).length > 0 ? 'Organization, User Profile, Project Data' : 'Limited'}

USER CONTEXT:
- Has user profile: ${!!userProfile}
- Has project data: ${!!projectData}
- User type: ${userProfile?.user_type || 'Unknown'}

REQUIREMENTS:
1. Create logical step groupings that minimize back-and-forth
2. Identify where AI writing assistance will be most valuable
3. Optimize for user experience and completion rate
4. Provide clear guidance for complex fields
5. Suggest preparation steps before starting

Focus on creating a smooth, guided experience that leverages AI assistance effectively.`
  }
}

/**
 * Clean AI response by removing markdown code blocks and extra whitespace
 */
function cleanJsonResponse(response: string): string {
  if (!response) return '{}'
  
  let cleaned = response.trim()
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '')
  cleaned = cleaned.replace(/\n?\s*```\s*$/i, '')
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim()
  
  // If response starts with explanation text, try to extract JSON
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (jsonMatch) {
      cleaned = jsonMatch[0]
    }
  }
  
  return cleaned
}

/**
 * Attempt to repair common JSON formatting issues
 */
function repairJsonResponse(response: string): string {
  let repaired = cleanJsonResponse(response)
  
  // Fix common AI response issues
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
  repaired = repaired.replace(/:\s*'([^']*?)'/g, ': "$1"') // Convert single quotes to double quotes
  repaired = repaired.replace(/\n/g, '\\n').replace(/\r/g, '\\r') // Escape newlines in strings
  
  return repaired
}