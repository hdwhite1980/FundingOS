/**
 * AI Walkthrough Generator API - Creates guided completion flow
 * /api/ai/generate-walkthrough
 */

import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../lib/aiProviderService'

export async function POST(request: NextRequest) {
  try {
    const { formStructure, userProfile, projectData, companySettings } = await request.json()

    if (!formStructure || !formStructure.fields) {
      return NextResponse.json(
        { success: false, error: 'Form structure is required' },
        { status: 400 }
      )
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
      walkthroughResult = JSON.parse(String(responseContent))
    } catch (parseError) {
      console.error('Failed to parse AI walkthrough response:', parseError)
      throw new Error('Invalid AI response format')
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

    return NextResponse.json(completeWalkthrough)

  } catch (error) {
    console.error('Walkthrough generation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Walkthrough generation failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
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

    // Organization/Company auto-fill
    if (field.autoFillSource === 'organization' || field.label?.toLowerCase().includes('organization')) {
      if (companySettings?.name && field.label?.toLowerCase().includes('name')) {
        autoFillValue = companySettings.name
        confidence = 0.9
        source = 'company_settings'
      } else if (companySettings?.address && field.label?.toLowerCase().includes('address')) {
        autoFillValue = companySettings.address
        confidence = 0.85
        source = 'company_settings'
      } else if (companySettings?.phone && field.type === 'phone') {
        autoFillValue = companySettings.phone
        confidence = 0.8
        source = 'company_settings'
      } else if (companySettings?.email && field.type === 'email') {
        autoFillValue = companySettings.email
        confidence = 0.8
        source = 'company_settings'
      }
    }

    // User profile auto-fill
    if (!autoFillValue && userProfile) {
      if (field.label?.toLowerCase().includes('contact') || field.label?.toLowerCase().includes('name')) {
        if (userProfile.full_name && field.label?.toLowerCase().includes('name')) {
          autoFillValue = userProfile.full_name
          confidence = 0.85
          source = 'user_profile'
        } else if (userProfile.email && field.type === 'email') {
          autoFillValue = userProfile.email
          confidence = 0.9
          source = 'user_profile'
        } else if (userProfile.phone && field.type === 'phone') {
          autoFillValue = userProfile.phone
          confidence = 0.85
          source = 'user_profile'
        }
      }
    }

    // Project data auto-fill
    if (!autoFillValue && projectData) {
      if (field.label?.toLowerCase().includes('project') && projectData.name) {
        autoFillValue = projectData.name
        confidence = 0.9
        source = 'project_data'
      } else if (field.label?.toLowerCase().includes('amount') || field.type === 'currency') {
        if (projectData.funding_needed) {
          autoFillValue = projectData.funding_needed
          confidence = 0.8
          source = 'project_data'
        }
      } else if (field.label?.toLowerCase().includes('description') && projectData.description) {
        autoFillValue = projectData.description
        confidence = 0.7
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