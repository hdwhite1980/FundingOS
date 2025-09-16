/**
 * Document Generation API Route
 * 
 * API endpoint for generating completed forms from extracted structure and user data
 * File: app/api/ai/document-generation/route.js
 */

import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'

export async function POST(request: NextRequest) {
  try {
    const { 
      formStructure,
      userData,
      options = {},
      action = 'generate' // generate | preview | validate
    } = await request.json()

    if (!formStructure?.formFields) {
      return NextResponse.json(
        { error: 'Form structure is required' },
        { status: 400 }
      )
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'User data is required' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'generate':
        result = await generateCompletedDocument(formStructure, userData, options)
        break
      case 'preview':
        result = await generateDocumentPreview(formStructure, userData, options)
        break
      case 'validate':
        result = await validateDocumentData(formStructure, userData)
        break
      case 'enhance-mappings':
        result = await enhanceFieldMappings(formStructure, userData, options.currentMappings)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('Document generation API error:', error)
    return NextResponse.json(
      { 
        error: 'Document generation failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function generateCompletedDocument(formStructure, userData, options) {
  // Enhanced field mapping using AI
  const fieldMappings = await generateIntelligentMappings(formStructure, userData, options)
  
  // Populate fields with mapped data
  const populatedFields = await populateFormFields(formStructure, userData, fieldMappings)
  
  // Generate document structure (for client-side PDF generation)
  const documentData = {
    formMetadata: formStructure.formMetadata,
    sections: [],
    populatedFields,
    fieldMappings,
    completionStats: {
      totalFields: Object.keys(formStructure.formFields).length,
      populatedFields: Object.keys(populatedFields).filter(key => populatedFields[key]).length,
      requiredFieldsPopulated: 0,
      completionPercentage: 0
    }
  }

  // Process sections or create default structure
  if (formStructure.formSections && formStructure.formSections.length > 0) {
    for (const section of formStructure.formSections) {
      const sectionFields = {}
      section.fields.forEach(fieldId => {
        if (formStructure.formFields[fieldId]) {
          sectionFields[fieldId] = {
            ...formStructure.formFields[fieldId],
            value: populatedFields[fieldId] || null,
            populated: !!populatedFields[fieldId]
          }
        }
      })

      documentData.sections.push({
        ...section,
        fields: sectionFields,
        completionStats: {
          total: Object.keys(sectionFields).length,
          populated: Object.keys(sectionFields).filter(id => sectionFields[id].populated).length
        }
      })
    }
  } else {
    // Create single section with all fields
    const allFields = {}
    Object.entries(formStructure.formFields).forEach(([fieldId, field]) => {
      allFields[fieldId] = {
        ...field,
        value: populatedFields[fieldId] || null,
        populated: !!populatedFields[fieldId]
      }
    })

    documentData.sections.push({
      id: 'main_section',
      title: 'Form Fields',
      fields: allFields,
      order: 1,
      completionStats: {
        total: Object.keys(allFields).length,
        populated: Object.keys(allFields).filter(id => allFields[id].populated).length
      }
    })
  }

  // Calculate completion statistics
  const totalPopulated = Object.keys(populatedFields).filter(key => populatedFields[key]).length
  const requiredFields = Object.values(formStructure.formFields).filter(field => field.required)
  const requiredPopulated = requiredFields.filter(field => 
    populatedFields[Object.keys(formStructure.formFields).find(key => 
      formStructure.formFields[key] === field
    )]
  ).length

  documentData.completionStats.populatedFields = totalPopulated
  documentData.completionStats.requiredFieldsPopulated = requiredPopulated
  documentData.completionStats.completionPercentage = Math.round(
    (totalPopulated / Object.keys(formStructure.formFields).length) * 100
  )

  return documentData
}

async function generateIntelligentMappings(formStructure, userData, options) {
  const mappingPrompt = `
Analyze this form structure and user data to create intelligent field mappings for ANY type of form:

FORM STRUCTURE:
${JSON.stringify(formStructure, null, 2)}

USER DATA:
${JSON.stringify(userData, null, 2)}

Create comprehensive field mappings by analyzing field labels semantically. Map fields based on their MEANING, not specific text matches:

MAPPING STRATEGY:
1. ORGANIZATION FIELDS: Look for variations of company/org name, legal name, business name
2. CONTACT FIELDS: Name, title, phone, email, address variations  
3. FINANCIAL FIELDS: EIN, tax ID, budget, amount, funding variations
4. PROJECT FIELDS: Project name, description, goals, timeline variations
5. NARRATIVE FIELDS: Mission, history, needs, outcomes, evaluation variations
6. ADMINISTRATIVE: Dates, signatures, certifications variations

FIELD LABEL SEMANTIC ANALYSIS:
- "Organization name" = "Company name" = "Legal name" = "Entity name"
- "EIN" = "Tax ID" = "Federal ID" = "Employer ID"
- "Executive Director" = "CEO" = "President" = "Director" = "Contact person"
- "Project name" = "Program name" = "Initiative name" = "Campaign name"
- "Amount requested" = "Funding needed" = "Grant amount" = "Budget request"
- "Mission statement" = "Purpose" = "Organizational mission"
- And so on...

Use intelligent semantic matching to map user data to form fields regardless of exact wording.

REQUIRED JSON RESPONSE:
{
  "fieldMappings": {
    "field_id": {
      "dataPath": "path.to.user.data",
      "transformation": "formatting rule if needed",
      "confidence": number (0-1),
      "fallbackValue": "actual user data value",
      "requiresInput": boolean,
      "mappingReason": "semantic reason for mapping"
    }
  },
  "missingData": [
    {
      "fieldId": "field_id",
      "fieldLabel": "Field Label",
      "required": boolean,
      "suggestedSource": "where to get this data",
      "dataType": "expected type",
      "priority": "high|medium|low"
    }
  ],
  "calculatedFields": {},
  "confidence": number (0-1),
  "recommendedActions": ["suggestions for improving completion"]
}
  `

  const response = await aiProviderService.generateCompletion(
    'smart-form-completion',
    [
      {
        role: 'system',
        content: 'You are an expert at semantic field mapping. Analyze field labels for MEANING rather than exact text matches. Map user data intelligently to any form type. Always respond with valid JSON.'
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
    throw new Error('No response received from AI provider')
  }

  return aiProviderService.safeParseJSON(response.content)
}

// Remove the Missouri-specific function since we want universal support

async function populateFormFields(formStructure, userData, mappings) {
  const populated = {}
  const fields = formStructure.formFields

  for (const [fieldId, field] of Object.entries(fields)) {
    const mapping = mappings.fieldMappings?.[fieldId]
    let value = null

    if (mapping) {
      // Use AI-generated mapping
      value = extractValueFromPath(userData, mapping.dataPath)
      
      // Apply transformation if specified
      if (value && mapping.transformation) {
        value = applyTransformation(value, mapping.transformation, field.type)
      }
      
      // Use fallback if primary value is missing
      if (!value && mapping.fallbackValue) {
        value = mapping.fallbackValue
      }
    } else {
      // Fallback to basic intelligent matching
      value = basicFieldMatch(field, userData)
    }

    if (value !== null && value !== undefined && value !== '') {
      populated[fieldId] = value
    }
  }

  // Handle calculated fields
  if (mappings.calculatedFields) {
    for (const [fieldId, calc] of Object.entries(mappings.calculatedFields)) {
      try {
        const calculatedValue = performCalculation(calc, populated, userData)
        if (calculatedValue !== null) {
          populated[fieldId] = calculatedValue
        }
      } catch (error) {
        console.warn(`Failed to calculate field ${fieldId}:`, error)
        if (calc.fallback) {
          populated[fieldId] = calc.fallback
        }
      }
    }
  }

  return populated
}

function extractValueFromPath(data, path) {
  try {
    return path.split('.').reduce((current, key) => current?.[key], data)
  } catch (error) {
    return null
  }
}

function applyTransformation(value, transformation, fieldType) {
  if (!value) return value

  switch (transformation) {
    case 'currency':
      const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''))
      return isNaN(num) ? value : `$${num.toLocaleString()}`
      
    case 'phone':
      const cleaned = value.toString().replace(/\D/g, '')
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
      }
      return value
      
    case 'date':
      if (value instanceof Date) return value.toLocaleDateString()
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        return new Date(value).toLocaleDateString()
      }
      return value
      
    case 'uppercase':
      return value.toString().toUpperCase()
      
    case 'lowercase':
      return value.toString().toLowerCase()
      
    case 'title_case':
      return value.toString().replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      )
      
    default:
      return value
  }
}

function basicFieldMatch(field, userData) {
  const label = field.label.toLowerCase()
  
  // Extract actual user data from the structure provided
  const org = userData.organization || userData.user || {}
  const project = userData.project || {}
  const user = userData.user || {}
  
  // ORGANIZATION NAME VARIATIONS
  if (label.match(/(organization|company|entity|business|legal)\s*(name|title)/)) {
    return org.organization_name || org.full_name || org.name || user.full_name
  }
  
  // TAX AND LEGAL IDENTIFIERS
  if (label.match(/(ein|tax\s*id|federal\s*id|employer\s*id|tax\s*exempt)/)) {
    return org.ein || org.tax_id || org.taxId
  }
  
  // ADDRESS COMPONENTS
  if (label.includes('address') && !label.includes('email')) {
    return org.address_line1 || org.address?.street || org.address
  }
  if (label.match(/^city/)) {
    return org.city || org.address?.city
  }
  if (label.match(/^state/)) {
    return org.state || org.state_province || org.address?.state
  }
  if (label.match(/(zip|postal)/)) {
    return org.zip_code || org.postal_code || org.address?.zip
  }
  
  // CONTACT INFORMATION
  if (label.match(/(phone|telephone|tel)/)) {
    return org.phone || user.phone
  }
  if (label.includes('email')) {
    return org.email || user.email
  }
  if (label.includes('website')) {
    return org.website
  }
  
  // EXECUTIVE/LEADERSHIP ROLES
  if (label.match(/(executive|director|ceo|president|leader|contact)/)) {
    return user.full_name || org.executive_director || org.contact_person
  }
  
  // ORGANIZATIONAL INFORMATION
  if (label.includes('mission')) {
    return org.mission_statement || 'To be provided upon request'
  }
  if (label.match(/(annual|yearly).*budget/)) {
    return org.annual_budget || org.annual_revenue
  }
  if (label.includes('history')) {
    return `${org.organization_name || 'Our organization'} was established in ${org.incorporation_year || org.founded_year || '[year]'} and has been serving the community since then.`
  }
  
  // PROJECT/PROGRAM INFORMATION
  if (label.match(/(project|program|initiative|campaign).*name/)) {
    return project.name || project.title
  }
  if (label.match(/(project|program).*description/)) {
    return project.description || project.summary
  }
  if (label.match(/(amount|funding|budget).*request/)) {
    return project.funding_request_amount || project.funding_needed || project.funding_goal
  }
  if (label.match(/(total|project).*budget/)) {
    return project.total_project_budget || project.funding_goal
  }
  if (label.match(/(timeline|duration|period)/)) {
    return project.timeline || project.project_duration || `${project.project_duration || '12'} months`
  }
  
  // NARRATIVE FIELDS
  if (label.match(/(goal|objective)/)) {
    return project.primary_goals || 'Project goals will be defined to meet program requirements'
  }
  if (label.match(/(need|problem|challenge)/)) {
    return project.community_benefit || 'Community needs assessment will be provided'
  }
  if (label.includes('evaluation')) {
    return project.evaluation_plan || 'Evaluation methodology will be developed in accordance with best practices'
  }
  if (label.match(/(outcome|impact|result)/)) {
    return project.outcome_measures || 'Measurable outcomes will be tracked throughout the project period'
  }
  if (label.includes('geographic')) {
    return project.project_location || org.geographic_service_area || org.city + ', ' + org.state
  }
  
  // FINANCIAL INFORMATION
  if (label.match(/(revenue|income)/)) {
    return org.annual_revenue
  }
  if (label.includes('employee') && label.includes('count')) {
    return org.employee_count || org.full_time_staff
  }
  
  // DATE FIELDS
  if (label.includes('date') || label.includes('deadline')) {
    return new Date().toLocaleDateString()
  }
  
  return null
}

function performCalculation(calculation, populatedFields, userData) {
  const { formula, dependencies } = calculation
  
  switch (formula) {
    case 'sum':
      return dependencies.reduce((sum, fieldId) => {
        const value = parseFloat(populatedFields[fieldId] || 0)
        return sum + (isNaN(value) ? 0 : value)
      }, 0)
      
    case 'project_duration_months':
      const start = userData.project?.startDate
      const end = userData.project?.endDate
      if (start && end) {
        const startDate = new Date(start)
        const endDate = new Date(end)
        return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 30))
      }
      return null
      
    case 'percentage':
      if (dependencies.length >= 2) {
        const numerator = parseFloat(populatedFields[dependencies[0]] || 0)
        const denominator = parseFloat(populatedFields[dependencies[1]] || 1)
        return denominator !== 0 ? Math.round((numerator / denominator) * 100) : 0
      }
      return null
      
    default:
      return null
  }
}

async function generateDocumentPreview(formStructure, userData, options) {
  const documentData = await generateCompletedDocument(formStructure, userData, options)
  
  return {
    ...documentData,
    preview: true,
    previewStats: {
      readyToGenerate: documentData.completionStats.completionPercentage > 50,
      missingRequired: Object.values(formStructure.formFields)
        .filter(field => field.required)
        .filter(field => !documentData.populatedFields[
          Object.keys(formStructure.formFields).find(key => 
            formStructure.formFields[key] === field
          )
        ]).length
    }
  }
}

async function validateDocumentData(formStructure, userData) {
  const validation = {
    valid: true,
    errors: [],
    warnings: [],
    missingRequired: [],
    invalidFields: []
  }

  for (const [fieldId, field] of Object.entries(formStructure.formFields)) {
    const value = userData[fieldId]
    
    // Check required fields
    if (field.required && (!value || value === '')) {
      validation.missingRequired.push({
        fieldId,
        label: field.label,
        section: field.section
      })
      validation.valid = false
    }
    
    // Validate field types and formats
    if (value) {
      const fieldValidation = validateFieldValue(value, field)
      if (!fieldValidation.valid) {
        validation.invalidFields.push({
          fieldId,
          label: field.label,
          value,
          error: fieldValidation.error
        })
        validation.valid = false
      }
    }
  }

  validation.errors = [
    ...validation.missingRequired.map(f => `Required field missing: ${f.label}`),
    ...validation.invalidFields.map(f => `Invalid ${f.label}: ${f.error}`)
  ]

  return validation
}

function validateFieldValue(value, field) {
  switch (field.type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return {
        valid: emailRegex.test(value),
        error: emailRegex.test(value) ? null : 'Invalid email format'
      }
      
    case 'phone':
      const phoneRegex = /^[\(\)\d\s\-\+\.]{10,}$/
      return {
        valid: phoneRegex.test(value),
        error: phoneRegex.test(value) ? null : 'Invalid phone number format'
      }
      
    case 'currency':
      const amount = parseFloat(value.toString().replace(/[^0-9.-]/g, ''))
      return {
        valid: !isNaN(amount) && amount >= 0,
        error: !isNaN(amount) && amount >= 0 ? null : 'Invalid currency amount'
      }
      
    case 'date':
      const date = new Date(value)
      return {
        valid: !isNaN(date.getTime()),
        error: !isNaN(date.getTime()) ? null : 'Invalid date format'
      }
      
    default:
      return { valid: true, error: null }
  }
}

async function enhanceFieldMappings(formStructure, userData, currentMappings = {}) {
  // Use AI to improve existing mappings based on user feedback or new data
  const enhancementPrompt = `
Analyze and improve these field mappings based on the form structure and user data:

CURRENT MAPPINGS:
${JSON.stringify(currentMappings, null, 2)}

FORM STRUCTURE:
${JSON.stringify(formStructure, null, 2)}

USER DATA:
${JSON.stringify(userData, null, 2)}

Provide enhanced mappings that:
1. Fix any incorrect mappings
2. Add missing mappings for unmapped fields
3. Improve mapping confidence
4. Suggest better data sources
5. Add helpful transformations

Return the complete enhanced mapping structure.
  `

  const response = await aiProviderService.generateCompletion(
    'smart-form-completion',
    [
      {
        role: 'system',
        content: 'You are an expert at optimizing form field mappings. Analyze current mappings and provide improvements. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: enhancementPrompt
      }
    ],
    {
      maxTokens: 4000,
      temperature: 0.1,
      responseFormat: 'json_object'
    }
  )

  if (!response?.content) {
    throw new Error('No response received from AI provider')
  }

  return aiProviderService.safeParseJSON(response.content)
}