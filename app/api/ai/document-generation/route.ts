/**
 * Document Generation API Route
 * 
 * API endpoint for generating completed forms from extracted structure and user data
 * File: app/api/ai/document-generation/route.js
 */

import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'

const MAX_TOKENS = 4000

// Type definitions
interface FormField {
  label: string
  type: string
  required?: boolean
  section?: string
  validation?: any
  options?: string[]
}

interface FormStructure {
  formFields: Record<string, FormField>
  formSections?: Array<{
    id: string
    title: string
    fields: string[]
    order: number
    description?: string
  }>
  formMetadata?: {
    title?: string
    version?: string
    totalFields?: number
    requiredFields?: number
  }
}

interface UserData {
  organization?: Record<string, any>
  project?: Record<string, any>
  user?: Record<string, any>
  [key: string]: any
}

interface DocumentSection {
  id: string
  title: string
  fields: Record<string, FormField & { value: any; populated: boolean }>
  order: number
  description?: string
  completionStats: {
    total: number
    populated: number
  }
}

interface CompletionStats {
  totalFields: number
  populatedFields: number
  requiredFieldsPopulated: number
  completionPercentage: number
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  missingRequired: Array<{
    fieldId: string
    label: string
    section?: string
  }>
  invalidFields: Array<{
    fieldId: string
    label: string
    value: any
    error: string
  }>
}

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

async function generateCompletedDocument(formStructure: FormStructure, userData: UserData, options: any) {
  // Enhanced field mapping using AI
  const fieldMappings = await generateIntelligentMappings(formStructure, userData, options)
  
  // Populate fields with mapped data
  const populatedFields = await populateFormFields(formStructure, userData, fieldMappings)
  
  // Generate document structure (for client-side PDF generation)
  const documentData: {
    formMetadata: any
    sections: DocumentSection[]
    populatedFields: Record<string, any>
    fieldMappings: any
    completionStats: CompletionStats
  } = {
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
Analyze this form structure and user data to create intelligent field mappings:

FORM STRUCTURE:
${JSON.stringify(formStructure, null, 2)}

USER DATA:
${JSON.stringify(userData, null, 2)}

Create comprehensive field mappings that:
1. Map form fields to available user data
2. Handle missing data gracefully
3. Suggest data transformations where needed
4. Identify calculated fields
5. Recommend fallback values

Focus on accuracy and completeness. Consider field types, validation rules, and semantic meaning.

REQUIRED JSON RESPONSE:
{
  "fieldMappings": {
    "field_id": {
      "dataPath": "path.to.user.data",
      "transformation": "formatting rule if needed",
      "confidence": number (0-1),
      "fallbackValue": "default if primary data missing",
      "requiresInput": boolean,
      "mappingReason": "explanation of mapping logic"
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
  "calculatedFields": {
    "field_id": {
      "formula": "calculation logic",
      "dependencies": ["other_field_ids"],
      "fallback": "value if calculation fails"
    }
  },
  "confidence": number (0-1),
  "recommendedActions": ["list of suggestions for improving completion"]
}
  `

  const response = await aiProviderService.generateCompletion(
    'smart-form-completion',
    [
      {
        role: 'system',
        content: 'You are an expert at mapping form fields to user data. Create intelligent, accurate field mappings that maximize form completion. Always respond with valid JSON.'
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
  
  // Organization fields
  if (label.includes('organization') || label.includes('company')) {
    return userData.organization?.name
  }
  if (label.includes('ein') || label.includes('tax')) {
    return userData.organization?.ein
  }
  if (label.includes('address')) {
    const addr = userData.organization?.address
    return addr ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}` : null
  }
  if (label.includes('phone')) {
    return userData.organization?.phone || userData.user?.phone
  }
  if (label.includes('email')) {
    return userData.organization?.email || userData.user?.email
  }
  
  // Project fields
  if (label.includes('project') && label.includes('title')) {
    return userData.project?.title
  }
  if (label.includes('project') && label.includes('description')) {
    return userData.project?.description
  }
  if (label.includes('budget') || label.includes('amount')) {
    return userData.project?.budgetTotal
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