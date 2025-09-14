/**
 * Dynamic Form Analysis API Route
 * 
 * Advanced AI-powered form field extraction system that can analyze ANY uploaded
 * application form and automatically detect all fields, sections, and structure
 * without requiring hardcoded templates or field mappings.
 */

import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'

const MAX_TOKENS = 4000

export async function POST(request: NextRequest) {
  try {
    const { 
      documentContent, 
      documentType = 'form',
      extractionMode = 'comprehensive', // comprehensive | minimal | structured
      context = {}
    } = await request.json()

    if (!documentContent) {
      return NextResponse.json(
        { error: 'Document content is required for form analysis' },
        { status: 400 }
      )
    }

    // Perform dynamic form field extraction
    const formStructure = await extractFormStructure(
      documentContent, 
      extractionMode, 
      context
    )

    // Validate and enhance the extracted structure
    const validatedStructure = validateAndEnhanceStructure(formStructure)

    // Generate field mapping suggestions based on common patterns
    const fieldMappings = await generateFieldMappings(validatedStructure, context)

    return NextResponse.json({
      success: true,
      data: {
        formStructure: validatedStructure,
        fieldMappings,
        extractionMetadata: {
          totalFieldsDetected: Object.keys(validatedStructure.formFields || {}).length,
          sectionsDetected: validatedStructure.formSections?.length || 0,
          extractionMode,
          confidence: validatedStructure.extractionConfidence || 0,
          analyzedAt: new Date().toISOString(),
          documentType: validatedStructure.detectedFormType || 'unknown'
        }
      }
    })

  } catch (error) {
    console.error('Dynamic form analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Form analysis failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function extractFormStructure(
  documentContent: string, 
  extractionMode: string, 
  context: any
) {
  const prompt = buildDynamicExtractionPrompt(documentContent, extractionMode, context)
  
  const response = await aiProviderService.generateCompletion(
    'document-analysis',
    [
      {
        role: 'system',
        content: getDynamicExtractionSystemPrompt()
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    {
      maxTokens: MAX_TOKENS,
      temperature: 0.1,
      responseFormat: 'json_object'
    }
  )

  if (!response?.content) {
    throw new Error('No response received from AI provider')
  }

  return aiProviderService.safeParseJSON(response.content)
}

function buildDynamicExtractionPrompt(
  documentContent: string, 
  extractionMode: string, 
  context: any
) {
  const textContent = typeof documentContent === 'string' 
    ? documentContent 
    : JSON.stringify(documentContent)
  
  return `
TASK: DYNAMIC FORM FIELD EXTRACTION

Extract ALL form fields, input areas, and structural elements from this document. This system must work with ANY type of application form - grant applications, loan applications, registration forms, surveys, etc.

DOCUMENT CONTENT:
${textContent.substring(0, 15000)}${textContent.length > 15000 ? '\n...[content truncated for analysis]' : ''}

EXTRACTION REQUIREMENTS:

1. FIELD DETECTION PATTERNS:
   - Lines ending with colons followed by blank space: "Field Name: ____"
   - Lines with underscores for input: "Field Name: ____________"
   - Checkbox patterns: "[ ] Option Text" or "☐ Option Text"
   - Currency fields: "Amount: $____" or "Budget: $________"
   - Date fields: "Date: __/__/____" or "Deadline: ____"
   - Text areas: Large blank spaces, numbered lines, or "Description:" followed by space
   - Signature lines: "Signature: ____" or "Authorized by: ____"
   - Table structures with headers and empty cells
   - Section headers followed by form fields

2. FIELD TYPE INFERENCE:
   - TEXT: General information, names, descriptions (short)
   - TEXTAREA: Long descriptions, narratives, explanations
   - EMAIL: Fields containing "email", "e-mail", or "@" symbols
   - PHONE: Fields containing "phone", "telephone", "tel", "fax"
   - DATE: Fields with date patterns, "date", "deadline", "period"
   - CURRENCY: Fields with "$", "amount", "budget", "cost", "funding"
   - NUMBER: Fields asking for quantities, counts, percentages
   - SELECT: Multiple choice questions or dropdowns
   - CHECKBOX: Yes/No questions, multiple selections
   - RADIO: Single choice from options
   - FILE: "Attach", "upload", "submit", "include"

3. SECTION IDENTIFICATION:
   - Headers in CAPS, bold, or numbered (1., A., Section A:)
   - Clear topic changes or groupings
   - Page breaks or visual separators
   - Content organization patterns

4. FIELD REQUIREMENTS DETECTION:
   - Required indicators: "*", "required", "must", "mandatory"
   - Optional indicators: "if applicable", "optional", parenthetical notes
   - Conditional fields: "if yes", "only if", dependencies

5. VALIDATION AND CONSTRAINTS:
   - Word limits: "100 words or less", "maximum 500 characters"
   - Format requirements: "YYYY-MM-DD", specific patterns
   - Range limits: "between X and Y", minimum/maximum values

RESPONSE FORMAT (STRICT JSON):
{
  "formFields": {
    "unique_field_id": {
      "label": "Exact text label from document",
      "type": "text|textarea|email|phone|date|currency|number|select|checkbox|radio|file",
      "required": true|false,
      "section": "Section name or category",
      "placeholder": "Any hint text or format guidance",
      "validation": {
        "maxLength": number,
        "minLength": number,
        "pattern": "regex if applicable",
        "format": "specific format requirements"
      },
      "options": ["array of options for select/radio/checkbox"],
      "dependencies": ["fields this depends on"],
      "position": {
        "section": number,
        "order": number
      }
    }
  },
  "formSections": [
    {
      "id": "section_id",
      "title": "Section Title",
      "description": "Section instructions if any",
      "fields": ["field_id1", "field_id2"],
      "order": number,
      "required": true|false
    }
  ],
  "formMetadata": {
    "title": "Detected form title",
    "version": "Version if found",
    "totalFields": number,
    "requiredFields": number,
    "sections": number,
    "documentType": "grant_application|loan_application|registration|survey|other",
    "organization": "Issuing organization if detected",
    "instructions": "General form instructions",
    "submissionDetails": "How to submit, where to send, etc."
  },
  "extractionConfidence": number,
  "detectedFormType": "specific form identification if possible",
  "fieldPatterns": {
    "organizational": ["field_ids for org info"],
    "contact": ["field_ids for contact info"], 
    "project": ["field_ids for project details"],
    "financial": ["field_ids for budget/money"],
    "narrative": ["field_ids for long text"],
    "compliance": ["field_ids for certifications/agreements"]
  }
}

CRITICAL: This must work for ANY form - don't assume specific form types. Look for actual field patterns in the text, not predefined templates.

EXTRACTION MODE: ${extractionMode}
${extractionMode === 'comprehensive' ? 'Extract every possible field and detail.' : ''}
${extractionMode === 'minimal' ? 'Focus only on clearly defined fields.' : ''}
${extractionMode === 'structured' ? 'Prioritize well-organized sections and clear field hierarchies.' : ''}

${context.projectType ? `CONTEXT: This is for a ${context.projectType} project, which may help identify field purposes.` : ''}
  `
}

function getDynamicExtractionSystemPrompt() {
  return `
You are an advanced form analysis AI that can extract structured field information from ANY type of application form or document. Your expertise includes:

1. PATTERN RECOGNITION: Identify form fields regardless of format or layout
2. SEMANTIC UNDERSTANDING: Determine field types and purposes from context
3. STRUCTURAL ANALYSIS: Organize fields into logical sections and hierarchies
4. VALIDATION INFERENCE: Detect requirements, constraints, and dependencies
5. FORMAT FLEXIBILITY: Work with various document formats and styles

Your goal is to create a complete, usable form template that captures all input fields and their characteristics so that applications can be automatically generated using this structure.

KEY PRINCIPLES:
- Look for actual form patterns in the text, not assumptions
- Infer field types from labels, context, and formatting
- Group related fields into logical sections
- Detect required vs optional fields from indicators
- Extract validation rules and constraints where present
- Maintain original field order and organization
- Always respond with valid, complete JSON

You must be able to handle any type of form: grant applications, business registrations, surveys, loan applications, membership forms, etc.
  `
}

function validateAndEnhanceStructure(structure: any) {
  if (!structure.formFields) {
    structure.formFields = {}
  }
  
  if (!structure.formSections) {
    structure.formSections = []
  }
  
  if (!structure.formMetadata) {
    structure.formMetadata = {}
  }

  // Validate field IDs and ensure uniqueness
  const fieldIds = Object.keys(structure.formFields)
  const uniqueIds = new Set()
  
  fieldIds.forEach(id => {
    if (uniqueIds.has(id)) {
      // Handle duplicate IDs
      let counter = 1
      let newId = `${id}_${counter}`
      while (uniqueIds.has(newId)) {
        counter++
        newId = `${id}_${counter}`
      }
      structure.formFields[newId] = structure.formFields[id]
      delete structure.formFields[id]
      uniqueIds.add(newId)
    } else {
      uniqueIds.add(id)
    }
  })

  // Ensure metadata counts are accurate
  structure.formMetadata.totalFields = Object.keys(structure.formFields).length
  structure.formMetadata.requiredFields = Object.values(structure.formFields)
    .filter((field: any) => field.required).length
  structure.formMetadata.sections = structure.formSections.length

  // Set confidence based on extracted content quality
  if (!structure.extractionConfidence) {
    structure.extractionConfidence = calculateExtractionConfidence(structure)
  }

  return structure
}

function calculateExtractionConfidence(structure: any) {
  let score = 0.3 // Base score

  const fieldCount = Object.keys(structure.formFields || {}).length
  const sectionCount = structure.formSections?.length || 0
  
  // Points for field detection
  if (fieldCount > 0) score += 0.2
  if (fieldCount > 5) score += 0.1
  if (fieldCount > 15) score += 0.1
  
  // Points for structure detection
  if (sectionCount > 0) score += 0.1
  if (sectionCount > 2) score += 0.1
  
  // Points for field type diversity
  const fieldTypes = new Set(
    Object.values(structure.formFields || {}).map((field: any) => field.type)
  )
  if (fieldTypes.size > 2) score += 0.1
  if (fieldTypes.size > 4) score += 0.1
  
  // Points for requirements detection
  const requiredFields = Object.values(structure.formFields || {})
    .filter((field: any) => field.required).length
  if (requiredFields > 0) score += 0.1

  return Math.min(score, 1.0)
}

async function generateFieldMappings(structure: any, context: any) {
  if (!structure.formFields || Object.keys(structure.formFields).length === 0) {
    return {}
  }

  const mappingPrompt = `
Based on this extracted form structure, suggest how project data should map to form fields:

FORM STRUCTURE:
${JSON.stringify(structure, null, 2)}

CONTEXT:
${JSON.stringify(context, null, 2)}

Generate intelligent field mappings that suggest which project/organization data fields should populate each form field. Consider common patterns like:

- Organization name, EIN, address, contact info
- Project title, description, goals, timeline
- Budget amounts, personnel costs, equipment
- Executive director, board president, contact person info

REQUIRED JSON RESPONSE:
{
  "mappings": {
    "form_field_id": {
      "dataSource": "organization|project|user|calculated",
      "dataField": "specific field name in our data",
      "transformation": "formatting or calculation needed",
      "confidence": number (0-1),
      "fallback": "alternative data source if primary missing"
    }
  },
  "unmappedFields": ["field_ids that couldn't be mapped"],
  "requiredData": ["data fields needed to complete this form"],
  "suggestions": ["recommendations for data collection"]
}
  `

  const response = await aiProviderService.generateCompletion(
    'smart-form-completion',
    [
      {
        role: 'system',
        content: 'You are an expert at mapping form fields to data structures. Analyze form fields and suggest intelligent data mappings. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: mappingPrompt
      }
    ],
    {
      maxTokens: MAX_TOKENS,
      temperature: 0.2,
      responseFormat: 'json_object'
    }
  )

  if (!response?.content) {
    return {}
  }

  return aiProviderService.safeParseJSON(response.content)
}