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

// Universal form field detection patterns that should work for any grant application
const UNIVERSAL_FORM_PATTERNS = {
  // Organization/Applicant Information
  organization: {
    patterns: [
      /organization\s*name/i,
      /applicant\s*organization/i,
      /entity\s*name/i,
      /institution\s*name/i,
      /company\s*name/i,
      /agency\s*name/i
    ],
    fieldType: 'text',
    section: 'applicant_info'
  },
  
  // Contact Information
  contact_person: {
    patterns: [
      /contact\s*person/i,
      /principal\s*investigator/i,
      /project\s*director/i,
      /authorized\s*representative/i,
      /primary\s*contact/i
    ],
    fieldType: 'text',
    section: 'contact_info'
  },
  
  email: {
    patterns: [
      /email\s*address/i,
      /e-mail/i,
      /electronic\s*mail/i
    ],
    fieldType: 'email',
    section: 'contact_info'
  },
  
  phone: {
    patterns: [
      /phone\s*number/i,
      /telephone/i,
      /contact\s*number/i
    ],
    fieldType: 'tel',
    section: 'contact_info'
  },
  
  address: {
    patterns: [
      /mailing\s*address/i,
      /street\s*address/i,
      /physical\s*address/i,
      /organization\s*address/i
    ],
    fieldType: 'textarea',
    section: 'contact_info'
  },
  
  // Project Information
  project_title: {
    patterns: [
      /project\s*title/i,
      /program\s*title/i,
      /grant\s*title/i,
      /proposal\s*title/i,
      /application\s*title/i
    ],
    fieldType: 'text',
    section: 'project_info'
  },
  
  project_description: {
    patterns: [
      /project\s*description/i,
      /program\s*description/i,
      /project\s*summary/i,
      /abstract/i,
      /overview/i
    ],
    fieldType: 'textarea',
    section: 'project_info'
  },
  
  // Financial Information
  requested_amount: {
    patterns: [
      /requested\s*amount/i,
      /funding\s*amount/i,
      /grant\s*amount/i,
      /total\s*budget/i,
      /project\s*cost/i,
      /amount\s*requested/i
    ],
    fieldType: 'currency',
    section: 'budget_info'
  },
  
  project_period: {
    patterns: [
      /project\s*period/i,
      /grant\s*period/i,
      /performance\s*period/i,
      /project\s*duration/i
    ],
    fieldType: 'text',
    section: 'project_info'
  },
  
  start_date: {
    patterns: [
      /start\s*date/i,
      /begin\s*date/i,
      /commencement\s*date/i,
      /project\s*start/i
    ],
    fieldType: 'date',
    section: 'project_info'
  },
  
  end_date: {
    patterns: [
      /end\s*date/i,
      /completion\s*date/i,
      /finish\s*date/i,
      /project\s*end/i
    ],
    fieldType: 'date',
    section: 'project_info'
  },
  
  // Eligibility & Requirements
  tax_exempt_status: {
    patterns: [
      /tax\s*exempt/i,
      /501\(c\)\(3\)/i,
      /nonprofit\s*status/i,
      /tax\s*id/i,
      /ein/i,
      /federal\s*id/i
    ],
    fieldType: 'text',
    section: 'eligibility'
  },
  
  // Narrative Sections (common across most grants)
  statement_of_need: {
    patterns: [
      /statement\s*of\s*need/i,
      /needs\s*assessment/i,
      /problem\s*statement/i,
      /community\s*need/i
    ],
    fieldType: 'textarea',
    section: 'narrative'
  },
  
  project_goals: {
    patterns: [
      /project\s*goals/i,
      /objectives/i,
      /outcomes/i,
      /goals\s*and\s*objectives/i
    ],
    fieldType: 'textarea',
    section: 'narrative'
  },
  
  methodology: {
    patterns: [
      /methodology/i,
      /approach/i,
      /implementation\s*plan/i,
      /work\s*plan/i,
      /activities/i
    ],
    fieldType: 'textarea',
    section: 'narrative'
  },
  
  evaluation: {
    patterns: [
      /evaluation/i,
      /assessment\s*plan/i,
      /measurement/i,
      /metrics/i,
      /success\s*indicators/i
    ],
    fieldType: 'textarea',
    section: 'narrative'
  },
  
  sustainability: {
    patterns: [
      /sustainability/i,
      /long.term\s*plan/i,
      /continuation/i,
      /future\s*funding/i
    ],
    fieldType: 'textarea',
    section: 'narrative'
  }
}

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
  // First try AI-based extraction
  let aiExtractedStructure = null
  try {
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

    if (response?.content) {
      aiExtractedStructure = aiProviderService.safeParseJSON(response.content)
    }
  } catch (error) {
    console.warn('AI extraction failed, falling back to pattern matching:', error)
  }

  // Always run pattern-based extraction as backup/enhancement
  const patternExtractedStructure = extractUniversalFormStructure(
    documentContent, 
    context.documentType || 'grant_application'
  )

  // Merge both approaches - AI takes precedence but patterns fill gaps
  return mergeExtractionResults(aiExtractedStructure, patternExtractedStructure)
}

// Function to extract form structure using universal patterns
function extractUniversalFormStructure(documentContent: string, documentType = 'grant_application') {
  const extractedFields: any = {}
  const sections = new Set()
  
  // Convert document to searchable text
  const searchableText = documentContent.toLowerCase()
  
  // Look for each pattern
  Object.entries(UNIVERSAL_FORM_PATTERNS).forEach(([fieldName, config]) => {
    config.patterns.forEach(pattern => {
      if (pattern.test(searchableText)) {
        extractedFields[fieldName] = {
          label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          type: config.fieldType,
          section: config.section,
          required: isFieldRequired(fieldName, searchableText),
          placeholder: generatePlaceholder(fieldName, config.fieldType),
          validation: getFieldValidation(config.fieldType)
        }
        sections.add(config.section)
      }
    })
  })
  
  // Also look for any explicit form fields (checkboxes, inputs, etc.)
  const explicitFields = extractExplicitFormFields(searchableText)
  Object.assign(extractedFields, explicitFields)
  
  // Create section structure
  const sectionStructure: any[] = []
  sections.forEach((sectionName: string) => {
    const sectionFields = Object.keys(extractedFields)
      .filter(fieldName => extractedFields[fieldName].section === sectionName)
    
    if (sectionFields.length > 0) {
      sectionStructure.push({
        id: sectionName,
        title: sectionName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        fields: sectionFields,
        order: getSectionOrder(sectionName),
        description: `Fields related to ${sectionName.replace(/_/g, ' ')}`
      })
    }
  })
  
  return {
    formFields: extractedFields,
    formSections: sectionStructure,
    formMetadata: {
      title: extractFormTitle(documentContent) || 'Grant Application',
      documentType,
      totalFields: Object.keys(extractedFields).length,
      extractedAt: new Date().toISOString(),
      confidence: calculatePatternExtractionConfidence(extractedFields, documentContent)
    },
    extractionConfidence: calculatePatternExtractionConfidence(extractedFields, documentContent),
    detectedFormType: documentType,
    fieldPatterns: categorizeFields(extractedFields)
  }
}

// Helper functions for pattern-based extraction
function isFieldRequired(fieldName: string, text: string) {
  const requiredPatterns = [
    new RegExp(`${fieldName.replace(/_/g, '\\s*')}.*\\*`, 'i'),
    new RegExp(`\\*.*${fieldName.replace(/_/g, '\\s*')}`, 'i'),
    new RegExp(`${fieldName.replace(/_/g, '\\s*')}.*(required|mandatory)`, 'i')
  ]
  return requiredPatterns.some(pattern => pattern.test(text))
}

function generatePlaceholder(fieldName: string, fieldType: string) {
  const placeholders: any = {
    text: {
      organization: 'Enter your organization name',
      contact_person: 'Enter contact person name',
      project_title: 'Enter your project title'
    },
    email: 'Enter email address',
    tel: 'Enter phone number',
    currency: 'Enter dollar amount',
    date: 'MM/DD/YYYY',
    textarea: `Enter your ${fieldName.replace(/_/g, ' ')}`
  }
  
  return placeholders[fieldType]?.[fieldName] || placeholders[fieldType] || 'Enter information'
}

function getFieldValidation(fieldType: string) {
  const validations: any = {
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email address' },
    currency: { pattern: /^\$?\d{1,3}(,\d{3})*(\.\d{2})?$/, message: 'Please enter a valid dollar amount' },
    tel: { pattern: /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, message: 'Please enter a valid phone number' },
    date: { pattern: /^\d{2}\/\d{2}\/\d{4}$/, message: 'Please enter date in MM/DD/YYYY format' }
  }
  return validations[fieldType] || null
}

function extractExplicitFormFields(text: string) {
  // Look for explicit form patterns like:
  // [ ] Checkbox options
  // _________ Blank lines
  // Field: ____________
  const explicitFields: any = {}
  
  // Checkbox patterns
  const checkboxMatches = text.match(/\[\s*\]\s*([^\n\r]+)/g) || []
  checkboxMatches.forEach((match: string, index: number) => {
    const label = match.replace(/\[\s*\]/, '').trim()
    if (label.length > 3) {
      explicitFields[`checkbox_${index}`] = {
        label,
        type: 'checkbox',
        section: 'additional_info',
        required: false
      }
    }
  })
  
  // Signature fields
  if (text.includes('signature') || text.includes('signed by')) {
    explicitFields['signature'] = {
      label: 'Authorized Signature',
      type: 'text',
      section: 'certification',
      required: true,
      placeholder: 'Enter name of authorized signatory'
    }
    
    explicitFields['signature_date'] = {
      label: 'Date Signed',
      type: 'date',
      section: 'certification',
      required: true
    }
  }
  
  return explicitFields
}

function extractFormTitle(content: string) {
  // Look for likely form titles at the beginning of the document
  const titlePatterns = [
    /^([^.\n]{5,60})\s*(application|grant|proposal|form)/i,
    /(application|grant|proposal)\s*for\s*([^.\n]{5,60})/i,
    /([^.\n]{5,60})\s*(funding|grant|award)\s*(application|request)/i
  ]
  
  const firstLines = content.split('\n').slice(0, 10).join('\n')
  
  for (const pattern of titlePatterns) {
    const match = firstLines.match(pattern)
    if (match) {
      return match[1] || match[2] || match[0]
    }
  }
  
  return null
}

function getSectionOrder(sectionName: string) {
  const sectionOrder: any = {
    'applicant_info': 1,
    'contact_info': 2,
    'project_info': 3,
    'budget_info': 4,
    'narrative': 5,
    'eligibility': 6,
    'additional_info': 7,
    'certification': 8
  }
  return sectionOrder[sectionName] || 999
}

function calculatePatternExtractionConfidence(fields: any, content: string) {
  // Base confidence on number of fields found and text analysis quality
  const fieldCount = Object.keys(fields).length
  const hasKeyFields = ['organization', 'project_title', 'requested_amount'].some(key => fields[key])
  const contentLength = content.length
  
  let confidence = 0.3 // Base confidence
  
  if (fieldCount > 5) confidence += 0.2
  if (fieldCount > 10) confidence += 0.2
  if (hasKeyFields) confidence += 0.2
  if (contentLength > 1000) confidence += 0.1
  
  return Math.min(confidence, 0.95)
}

function categorizeFields(fields: any) {
  const categories: any = {
    organizational: [],
    contact: [],
    project: [],
    financial: [],
    narrative: [],
    compliance: []
  }
  
  Object.entries(fields).forEach(([fieldId, field]: [string, any]) => {
    switch (field.section) {
      case 'applicant_info':
        categories.organizational.push(fieldId)
        break
      case 'contact_info':
        categories.contact.push(fieldId)
        break
      case 'project_info':
        categories.project.push(fieldId)
        break
      case 'budget_info':
        categories.financial.push(fieldId)
        break
      case 'narrative':
        categories.narrative.push(fieldId)
        break
      case 'eligibility':
      case 'certification':
        categories.compliance.push(fieldId)
        break
    }
  })
  
  return categories
}

function mergeExtractionResults(aiResult: any, patternResult: any) {
  if (!aiResult && !patternResult) {
    return { formFields: {}, formSections: [], formMetadata: {} }
  }
  
  if (!aiResult) return patternResult
  if (!patternResult) return aiResult
  
  // Merge form fields - AI takes precedence, patterns fill gaps
  const mergedFields = { ...patternResult.formFields }
  if (aiResult.formFields) {
    Object.assign(mergedFields, aiResult.formFields)
  }
  
  // Merge sections - prefer AI structure if available
  const mergedSections = aiResult.formSections || patternResult.formSections || []
  
  // Merge metadata
  const mergedMetadata = {
    ...patternResult.formMetadata,
    ...aiResult.formMetadata,
    totalFields: Object.keys(mergedFields).length,
    extractionMethod: 'hybrid_ai_pattern'
  }
  
  return {
    formFields: mergedFields,
    formSections: mergedSections,
    formMetadata: mergedMetadata,
    extractionConfidence: Math.max(
      aiResult.extractionConfidence || 0,
      patternResult.extractionConfidence || 0
    ),
    detectedFormType: aiResult.detectedFormType || patternResult.detectedFormType,
    fieldPatterns: aiResult.fieldPatterns || patternResult.fieldPatterns
  }
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