/**
 * Smart Form Completion API
 * Uses AI to intelligently fill out form fields based on user/project data
 */

import { NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService.js'

export async function POST(request) {
  try {
    const { formStructure, userData } = await request.json()

    console.log('🚀 Smart Form Completion Request:', {
      formFieldCount: Object.keys(formStructure?.formFields || {}).length,
      hasUserData: !!userData,
      userProfile: userData?.userProfile ? Object.keys(userData.userProfile) : null,
      project: userData?.project ? Object.keys(userData.project) : null
    })

    if (!formStructure?.formFields) {
      return NextResponse.json({ 
        error: 'No form fields provided',
        fieldCompletions: {},
        completionPercentage: 0
      }, { status: 400 })
    }

    // Use the document generation logic to map fields
    const mappingPrompt = buildFormMappingPrompt(formStructure, userData)
    
    const response = await aiProviderService.generateCompletion(
      'smart-form-completion',
      [
        {
          role: 'system',
          content: `You are an expert at semantic field mapping and form completion. 

Your expertise includes:
- Semantic text analysis to match field labels by MEANING, not literal text
- Understanding grant application, nonprofit, and business form structures  
- Intelligent data transformation and formatting
- Working with complex nested data structures
- Providing comprehensive field completion with high confidence

Key principles:
- SEMANTIC OVER LITERAL: "Organization name" = "Company name" = "Legal entity name"
- USE ALL AVAILABLE DATA: Leverage the rich user data provided comprehensively
- INTELLIGENT FALLBACKS: Provide multiple data sources for critical fields
- COMPLETE FORMS: Fill every possible field with available data
- FIELD TYPE AWARENESS: Apply appropriate transformations for currency, dates, phones, etc.

Always respond with valid JSON matching the exact structure requested.`
        },
        {
          role: 'user',
          content: mappingPrompt
        }
      ],
      {
        maxTokens: 4000,
        temperature: 0.1,
        responseFormat: 'json_object'
      }
    )

    if (!response?.content) {
      throw new Error('No response from AI provider')
    }

    const mappings = aiProviderService.safeParseJSON(response.content)
    
    // Apply the mappings to create filled form
    const filledForm = applyFieldMappings(formStructure.formFields, mappings, userData)
    
    // Calculate completion stats
    const totalFields = Object.keys(formStructure.formFields).length
    const completedFields = Object.keys(filledForm).filter(key => 
      filledForm[key] && filledForm[key] !== '[To be completed]' && filledForm[key] !== ''
    ).length
    
    const completionResult = {
      success: true,
      fieldCompletions: filledForm,
      filledForm: filledForm,
      completionPercentage: totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0,
      confidence: mappings.confidence || 0.8,
      mappingStats: {
        totalFields,
        completedFields,
        highConfidenceFields: completedFields,
        requiresUserInput: Math.max(0, totalFields - completedFields)
      },
      missingData: mappings.missingData || [],
      analysisDate: new Date().toISOString()
    }

    console.log('✅ Smart Form Completion Result:', {
      completionPercentage: completionResult.completionPercentage,
      completedFields: completedFields,
      totalFields: totalFields,
      topFields: Object.keys(filledForm).slice(0, 5)
    })

    return NextResponse.json(completionResult)

  } catch (error) {
    console.error('Smart Form Completion error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Form completion failed',
      message: error.message,
      fieldCompletions: {},
      completionPercentage: 0
    }, { status: 500 })
  }
}

function buildFormMappingPrompt(formStructure, userData) {
  const { userProfile, project, organization } = userData

  return `
SMART FORM COMPLETION - COMPREHENSIVE FIELD MAPPING

You have access to comprehensive user data and must intelligently map it to form fields using semantic understanding.

FORM FIELDS TO COMPLETE:
${JSON.stringify(formStructure.formFields, null, 2)}

AVAILABLE USER DATA:
${JSON.stringify({
  userProfile: userProfile || {},
  project: project || {},
  organization: organization || {}
}, null, 2)}

MAPPING REQUIREMENTS:

🎯 SEMANTIC FIELD MAPPING:
- Match fields by MEANING, not exact text
- "Organization Name" = "Company Name" = "Legal Entity" = "Applicant Name"
- "Project Title" = "Program Name" = "Initiative Title" = "Grant Title"  
- "Contact Person" = "Primary Contact" = "Authorized Representative"
- "Total Budget" = "Project Cost" = "Funding Request" = "Amount Requested"
- "Start Date" = "Project Begin Date" = "Implementation Start"
- "Description" = "Summary" = "Abstract" = "Project Overview"

📊 INTELLIGENT DATA EXTRACTION:
Use ALL available data sources:
- User Profile: name, email, organization details, contact info
- Project Data: title, description, budget, timeline, goals
- Organization Info: legal name, address, tax status, mission

🔄 SMART TRANSFORMATIONS:
- Format currencies: 50000 → "$50,000"
- Format dates: "2024-01-01" → "01/01/2024" 
- Format phones: "+1234567890" → "(123) 456-7890"
- Capitalize names properly
- Generate content when field requires descriptive text

✨ COMPREHENSIVE COMPLETION:
- Fill EVERY possible field with available data
- Use computed values when direct mapping isn't available
- Provide intelligent defaults for common fields
- Generate reasonable content for narrative fields

REQUIRED JSON RESPONSE:
{
  "fieldMappings": {
    "field_id": {
      "value": "mapped_value",
      "confidence": 0.95,
      "source": "userProfile.organization_name",
      "transformation": "none|currency|date|phone|capitalize"
    }
  },
  "confidence": 0.85,
  "completionStats": {
    "totalFields": 0,
    "mappedFields": 0,
    "highConfidence": 0
  }
}

CRITICAL: Map EVERY form field to the best available data source. Don't leave fields empty if ANY relevant data exists.
`
}

function applyFieldMappings(formFields, mappings, userData) {
  const filledForm = {}

  // Apply direct mappings
  if (mappings.fieldMappings) {
    for (const [fieldId, mapping] of Object.entries(mappings.fieldMappings)) {
      if (mapping.value && mapping.value !== null && mapping.value !== '') {
        filledForm[fieldId] = mapping.value
      }
    }
  }

  // Fill any remaining fields with fallback values
  for (const [fieldId, fieldConfig] of Object.entries(formFields)) {
    if (!filledForm[fieldId]) {
      const fallbackValue = generateFallbackValue(fieldId, fieldConfig, userData)
      if (fallbackValue) {
        filledForm[fieldId] = fallbackValue
      }
    }
  }

  return filledForm
}

function generateFallbackValue(fieldId, fieldConfig, userData) {
  const { userProfile, project } = userData
  const label = fieldConfig.label?.toLowerCase() || fieldId.toLowerCase()

  // Common field mappings
  if (label.includes('organization') || label.includes('company') || label.includes('applicant')) {
    return userProfile?.organization_name || userProfile?.company_name || 'Organization Name Required'
  }
  
  if (label.includes('project') && label.includes('title')) {
    return project?.name || project?.title || 'Project Title Required'
  }
  
  if (label.includes('contact') || label.includes('name')) {
    return userProfile?.full_name || userProfile?.first_name + ' ' + userProfile?.last_name || 'Contact Name Required'
  }
  
  if (label.includes('email')) {
    return userProfile?.email || 'Email Required'
  }
  
  if (label.includes('phone')) {
    return userProfile?.phone || 'Phone Number Required'
  }
  
  if (label.includes('address')) {
    return userProfile?.address || 'Address Required'
  }
  
  if (label.includes('budget') || label.includes('amount') || label.includes('funding')) {
    return project?.funding_needed || project?.total_project_budget || '0'
  }
  
  if (label.includes('date')) {
    return new Date().toLocaleDateString()
  }

  return '[To be completed]'
}