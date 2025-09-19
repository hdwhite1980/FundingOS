/**
 * Document Generation API Route
 * 
 * API endpoint for generating completed forms from extracted structure and user data
 * File: app/api/ai/document-generation/route.js
 */

import { NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'

export async function POST(request) {
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
COMPREHENSIVE FORM FIELD MAPPING SYSTEM

Analyze this form structure and extensive user data to create intelligent field mappings for ANY type of form.

FORM STRUCTURE TO MAP:
${JSON.stringify(formStructure, null, 2)}

COMPREHENSIVE USER DATA AVAILABLE:
${JSON.stringify(userData, null, 2)}

Your task is to create comprehensive field mappings by analyzing field labels SEMANTICALLY and mapping them to the rich data available.

SEMANTIC MAPPING CATEGORIES:

🏢 ORGANIZATION IDENTITY:
- Legal names: "Organization name", "Legal name", "Entity name", "Company name", "Business name"
- Types: "Organization type", "Entity type", "Business type", "Nonprofit type"
- IDs: "EIN", "Tax ID", "Federal ID", "Employer ID", "TIN", "FEIN"

📍 LOCATION & CONTACT:
- Address variations: "Address", "Street address", "Mailing address", "Physical address"
- Contact: "Phone", "Telephone", "Email", "Website", "Contact information"
- Geography: "City", "State", "ZIP", "County", "Service area"

👥 LEADERSHIP & CONTACTS:
- Executive roles: "Executive Director", "CEO", "President", "Director", "Contact person"
- Board info: "Board chair", "Board size", "Governance"

💰 FINANCIAL INFORMATION:
- Revenue/Budget: "Annual budget", "Annual revenue", "Operating budget", "Total budget"
- Funding: "Amount requested", "Grant amount", "Funding needed", "Budget request"
- Financial status: "Audit status", "Financial systems"

📋 PROJECT INFORMATION:
- Names: "Project name", "Program name", "Initiative name", "Campaign title"
- Description: "Project description", "Program summary", "Project narrative"
- Impact: "People served", "Beneficiaries", "Target population"
- Timeline: "Project duration", "Timeline", "Start date", "End date"

🎯 MISSION & PROGRAMS:
- Mission: "Mission statement", "Organizational purpose", "Mission"
- Services: "Services provided", "Programs offered", "Service areas"
- Outcomes: "Expected outcomes", "Goals", "Objectives", "Impact"

📊 ORGANIZATIONAL CAPACITY:
- Staff: "Full-time staff", "Employee count", "Staff size"
- Experience: "Years in operation", "Grant experience", "Track record"
- Capacity: "Grant writing capacity", "Data collection capacity"

🏛️ COMPLIANCE & CERTIFICATIONS:
- Registration: "SAM.gov status", "Grants.gov status", "UEI number"
- Legal status: "Date incorporated", "State of incorporation"
- History: "Compliance history", "Past performance"

INTELLIGENT MAPPING STRATEGY:
1. Use SEMANTIC SIMILARITY - match meaning, not exact text
2. PRIORITIZE USER DATA - use the most specific/relevant data available
3. APPLY SMART TRANSFORMATIONS - format data appropriately for field type
4. PROVIDE FALLBACKS - offer multiple data sources when primary is missing
5. CALCULATE DERIVED FIELDS - compute values from available data when needed

REQUIRED JSON RESPONSE FORMAT:
{
  "fieldMappings": {
    "field_id": {
      "dataPath": "path.to.user.data.in.userData",
      "transformation": "formatting_rule_if_needed",
      "confidence": 0.95,
      "fallbackPaths": ["backup.path.1", "backup.path.2"],
      "fallbackValue": "computed or literal fallback value",
      "requiresInput": false,
      "mappingReason": "detailed explanation of semantic matching logic",
      "dataSource": "organization|project|user|computed",
      "fieldType": "detected field type"
    }
  },
  "missingData": [
    {
      "fieldId": "field_id",
      "fieldLabel": "Field Label From Form",
      "required": true,
      "suggestedSource": "where user could find this data",
      "dataType": "text|number|date|currency|email|phone",
      "priority": "high|medium|low",
      "reason": "why this data is important"
    }
  ],
  "calculatedFields": {
    "field_id": {
      "formula": "calculation_type",
      "dependencies": ["field1", "field2"],
      "fallback": "default value if calculation fails"
    }
  },
  "confidence": 0.85,
  "mappingStats": {
    "totalFields": 0,
    "mappedFields": 0,
    "highConfidenceFields": 0,
    "requiresUserInput": 0
  },
  "recommendedActions": [
    "specific suggestions for improving field completion"
  ]
}

CRITICAL SUCCESS FACTORS:
- Map EVERY field in the form structure, even if confidence is low
- Use semantic analysis to match variations of the same concept
- Leverage the comprehensive user data provided - don't leave fields unmapped if data exists
- Provide intelligent transformations (currency formatting, date formatting, etc.)
- Explain your mapping logic clearly for transparency
  `

  const response = await aiProviderService.generateCompletion(
    'smart-form-completion',
    [
      {
        role: 'system',
        content: `You are an expert semantic field mapping AI with access to comprehensive organizational and project data. 

Your expertise includes:
- Semantic text analysis to match field labels by MEANING, not literal text
- Understanding grant application, nonprofit, and business form structures  
- Intelligent data transformation and formatting
- Working with complex nested data structures
- Providing transparent mapping logic and confidence scoring

Key principles:
- SEMANTIC OVER LITERAL: "Organization name" = "Company name" = "Legal entity name"
- USE ALL AVAILABLE DATA: Leverage the rich user data provided comprehensively
- INTELLIGENT FALLBACKS: Provide multiple data sources for critical fields
- TRANSPARENT LOGIC: Explain why each mapping makes sense
- FIELD TYPE AWARENESS: Apply appropriate transformations for currency, dates, phones, etc.

Always respond with valid JSON matching the exact structure requested.`
      },
      {
        role: 'user',
        content: mappingPrompt
      }
    ],
    {
      maxTokens: 6000,
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
      // Try primary data path
      value = extractValueFromPath(userData, mapping.dataPath)
      
      // Try fallback paths if primary fails
      if (!value && mapping.fallbackPaths) {
        for (const fallbackPath of mapping.fallbackPaths) {
          value = extractValueFromPath(userData, fallbackPath)
          if (value) break
        }
      }
      
      // Apply transformation if specified and value exists
      if (value && mapping.transformation) {
        value = applyTransformation(value, mapping.transformation, field.type)
      }
      
      // Use fallback value if no data found
      if (!value && mapping.fallbackValue) {
        value = mapping.fallbackValue
      }
    } else {
      // Enhanced fallback to comprehensive intelligent matching
      value = comprehensiveFieldMatch(field, userData)
    }

    // Store the populated value if it's meaningful
    if (value !== null && value !== undefined && value !== '' && value !== 'N/A') {
      populated[fieldId] = value
    }
  }

  // Handle calculated fields with enhanced logic
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
    const keys = path.split('.')
    let current = data
    
    for (const key of keys) {
      if (current === null || current === undefined) return null
      
      // Handle array access
      if (key.includes('[') && key.includes(']')) {
        const [arrayKey, indexStr] = key.split('[')
        const index = parseInt(indexStr.replace(']', ''))
        current = current[arrayKey]
        if (Array.isArray(current) && index < current.length) {
          current = current[index]
        } else {
          return null
        }
      } else {
        current = current[key]
      }
    }
    
    return current
  } catch (error) {
    console.warn('Error extracting value from path:', path, error)
    return null
  }
}

function applyTransformation(value, transformation, fieldType) {
  if (!value) return value

  switch (transformation) {
    case 'currency':
    case 'financial':
      // Handle already formatted currency
      if (typeof value === 'string' && value.includes('$')) {
        return value
      }
      // Parse and format currency
      const numStr = value.toString().replace(/[^0-9.-]/g, '')
      const num = parseFloat(numStr)
      return isNaN(num) ? value : `$${num.toLocaleString()}`
      
    case 'phone':
      const cleaned = value.toString().replace(/\D/g, '')
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
      } else if (cleaned.length === 11 && cleaned[0] === '1') {
        return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`
      }
      return value
      
    case 'date':
    case 'date_format':
      if (value instanceof Date) return value.toLocaleDateString()
      if (typeof value === 'string') {
        // Handle ISO date strings
        if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
          return new Date(value).toLocaleDateString()
        }
        // Handle other common date formats
        const parsed = new Date(value)
        if (!isNaN(parsed.getTime())) {
          return parsed.toLocaleDateString()
        }
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
      
    case 'proper_case':
      return value.toString().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
      
    case 'sentence_case':
      const str = value.toString().toLowerCase()
      return str.charAt(0).toUpperCase() + str.slice(1)
      
    case 'underscore_to_space':
      return value.toString().replace(/_/g, ' ')
      
    case 'clean_org_type':
      return value.toString().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      
    case 'comma_separated':
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      return value
      
    case 'bullet_list':
      if (Array.isArray(value)) {
        return value.map(item => `• ${item}`).join('\n')
      }
      return value
      
    case 'yes_no':
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
      }
      if (typeof value === 'string') {
        const lower = value.toLowerCase()
        if (['true', 'yes', '1', 'active', 'enabled'].includes(lower)) return 'Yes'
        if (['false', 'no', '0', 'inactive', 'disabled'].includes(lower)) return 'No'
      }
      return value
      
    case 'checkbox':
      if (typeof value === 'boolean') {
        return value ? '☑' : '☐'
      }
      if (typeof value === 'string') {
        const lower = value.toLowerCase()
        if (['true', 'yes', '1', 'active', 'enabled'].includes(lower)) return '☑'
        if (['false', 'no', '0', 'inactive', 'disabled'].includes(lower)) return '☐'
      }
      return value
      
    case 'address_format':
      if (typeof value === 'object' && value.street) {
        let formatted = value.street
        if (value.city) formatted += `, ${value.city}`
        if (value.state) formatted += `, ${value.state}`
        if (value.zip) formatted += ` ${value.zip}`
        return formatted
      }
      return value
      
    case 'full_name':
      if (typeof value === 'object' && (value.first_name || value.last_name)) {
        return `${value.first_name || ''} ${value.last_name || ''}`.trim()
      }
      return value
      
    case 'signature_format':
      return `${value} (Electronic Signature)`
      
    case 'percentage':
      const percentNum = parseFloat(value.toString().replace(/[^0-9.-]/g, ''))
      return isNaN(percentNum) ? value : `${percentNum}%`
      
    default:
      return value
  }
}

function comprehensiveFieldMatch(field, userData) {
  const label = field.label.toLowerCase()
  
  // Extract data from comprehensive structure
  const org = userData.organization || {}
  const project = userData.project || {}
  const user = userData.user || {}
  const opportunity = userData.opportunity || {}
  
  // ORGANIZATION IDENTITY & LEGAL
  if (label.match(/(organization|company|entity|business|legal|applicant).*name/)) {
    return org.organization_name || user.full_name
  }
  if (label.match(/(ein|tax.*id|federal.*id|employer.*id|tin|fein)/)) {
    return org.tax_id || org.ein
  }
  if (label.match(/(uei|duns|sam\.gov|unique.*entity)/)) {
    return org.duns_uei_number
  }
  if (label.match(/(incorporation.*date|incorporated|charter)/)) {
    return org.date_incorporated
  }
  if (label.match(/(incorporation.*state|incorporated.*state|charter.*state)/)) {
    return org.state_incorporated
  }
  if (label.match(/(organization.*type|entity.*type|legal.*form)/)) {
    return org.organization_type?.replace('_', ' ')
  }
  
  // CONTACT & ADDRESS INFORMATION
  if (label.match(/^(street |mailing |physical )?address(?!\s*email)/)) {
    let address = org.address_line1
    if (org.address_line2) {
      address += (address ? ', ' : '') + org.address_line2
    }
    return address
  }
  if (label.match(/address.*line.*1|street.*address/)) {
    return org.address_line1
  }
  if (label.match(/address.*line.*2|suite|apartment|unit/)) {
    return org.address_line2
  }
  if (label.match(/^city/)) {
    return org.city
  }
  if (label.match(/^state|state.*province/)) {
    return org.state
  }
  if (label.match(/(zip|postal).*code/)) {
    return org.zip_code
  }
  if (label.match(/(phone|telephone|tel)(?!.*email)/)) {
    return org.phone || org.contact_phone || user.phone
  }
  if (label.includes('email')) {
    return org.contact_email || user.email
  }
  if (label.includes('website')) {
    return org.website
  }
  
  // EXECUTIVE & LEADERSHIP
  if (label.match(/(executive.*director|ceo|president|director|contact.*person|authorized.*official)/)) {
    return org.executive_director || org.contact_person || user.full_name
  }
  if (label.match(/(contact.*name|signatory|responsible.*person)/)) {
    return user.full_name
  }
  if (label.match(/board.*size|board.*members/)) {
    return org.board_size
  }
  
  // FINANCIAL INFORMATION
  if (label.match(/(annual.*budget|operating.*budget|yearly.*budget)/)) {
    return org.annual_budget ? `$${parseInt(org.annual_budget).toLocaleString()}` : null
  }
  if (label.match(/(annual.*revenue|gross.*receipts|total.*revenue)/)) {
    return org.annual_revenue ? `$${parseInt(org.annual_revenue).toLocaleString()}` : null
  }
  if (label.match(/(amount.*requested|funding.*needed|grant.*amount|budget.*request)/)) {
    const amount = project.funding_request_amount || project.funding_needed || project.funding_goal || project.total_project_budget
    return amount ? `$${parseInt(amount).toLocaleString()}` : null
  }
  if (label.match(/(total.*project.*budget|project.*cost|program.*budget)/)) {
    const budget = project.total_project_budget || project.budget || project.funding_goal
    return budget ? `$${parseInt(budget).toLocaleString()}` : null
  }
  if (label.match(/largest.*grant|previous.*award/)) {
    return org.largest_grant ? `$${parseInt(org.largest_grant).toLocaleString()}` : null
  }
  
  // ORGANIZATIONAL CAPACITY
  if (label.match(/(years.*operation|years.*existence|established)/)) {
    return org.years_in_operation
  }
  if (label.match(/(full.*time.*staff|employee.*count|staff.*size)/)) {
    return org.full_time_staff
  }
  if (label.match(/grant.*experience|fundraising.*experience/)) {
    return org.grant_experience?.replace('_', ' ')
  }
  if (label.match(/grant.*writing.*capacity/)) {
    return org.grant_writing_capacity?.replace('_', ' ')
  }
  if (label.match(/audit.*status|financial.*audit/)) {
    return org.audit_status?.replace('_', ' ')
  }
  if (label.match(/data.*collection.*capacity/)) {
    return org.data_collection_capacity?.replace('_', ' ')
  }
  
  // MISSION & PROGRAMS
  if (label.match(/(mission.*statement|organizational.*mission|purpose)/)) {
    return org.mission_statement || 'To provide essential services and support to our community while maintaining the highest standards of excellence and integrity.'
  }
  if (label.match(/(service.*areas|programs.*offered|primary.*services)/)) {
    if (Array.isArray(org.primary_service_areas)) {
      return org.primary_service_areas.join(', ')
    }
    return org.primary_service_areas
  }
  if (label.match(/(target.*demographics|population.*served|beneficiaries)/)) {
    if (Array.isArray(org.target_demographics)) {
      return org.target_demographics.join(', ')
    }
    return org.target_demographics
  }
  if (label.match(/(geographic.*area|service.*radius|coverage.*area)/)) {
    return org.service_radius || `${org.city}, ${org.state} and surrounding areas`
  }
  
  // PROJECT-SPECIFIC INFORMATION
  if (label.match(/(project.*name|program.*name|initiative.*title|campaign.*name)/)) {
    return project.name || project.title
  }
  if (label.match(/(project.*description|program.*summary|project.*narrative)/)) {
    return project.description || project.project_narrative
  }
  if (label.match(/(project.*goals|objectives|expected.*outcomes)/)) {
    return project.primary_goals || 'This project will achieve measurable positive outcomes for our target population through evidence-based interventions and strategic partnerships.'
  }
  if (label.match(/(people.*served|beneficiaries.*count|participants)/)) {
    return project.estimated_people_served
  }
  if (label.match(/(project.*location|program.*location|service.*location)/)) {
    return project.project_location || project.location || `${org.city}, ${org.state}`
  }
  if (label.match(/(project.*duration|timeline|time.*frame)/)) {
    return project.project_duration || project.timeline || '12 months'
  }
  if (label.match(/(start.*date|begin.*date|commencement)/)) {
    return project.start_date ? new Date(project.start_date).toLocaleDateString() : new Date().toLocaleDateString()
  }
  if (label.match(/(end.*date|completion.*date|finish)/)) {
    if (project.end_date) {
      return new Date(project.end_date).toLocaleDateString()
    }
    // Calculate end date based on duration
    const startDate = project.start_date ? new Date(project.start_date) : new Date()
    const duration = project.project_duration ? parseInt(project.project_duration) : 12
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + duration)
    return endDate.toLocaleDateString()
  }
  if (label.match(/(evaluation.*plan|assessment.*method|measurement)/)) {
    return project.evaluation_plan || 'Project outcomes will be measured through pre/post assessments, participant surveys, and quantitative tracking of key performance indicators.'
  }
  if (label.match(/(community.*benefit|impact|expected.*results)/)) {
    return project.community_benefit || 'This project will provide significant benefit to our community by addressing critical needs and improving quality of life for participants.'
  }
  
  // COMPLIANCE & CERTIFICATIONS
  if (label.match(/sam\.gov.*status|system.*award.*management/)) {
    return org.sam_gov_status?.replace('_', ' ') || 'Active'
  }
  if (label.match(/grants\.gov.*status/)) {
    return org.grants_gov_status?.replace('_', ' ') || 'Registered'
  }
  if (label.match(/compliance.*history|past.*performance/)) {
    return org.compliance_history?.replace('_', ' ') || 'No compliance issues'
  }
  
  // DATE FIELDS
  if (label.match(/(today.*date|current.*date|submission.*date|application.*date)/)) {
    return new Date().toLocaleDateString()
  }
  if (label.includes('date') && !label.includes('update')) {
    return new Date().toLocaleDateString()
  }
  
  // SIGNATURE FIELDS
  if (label.match(/(signature|sign|authorize|certify)/)) {
    return `${user.full_name} (Electronic Signature)`
  }
  if (label.match(/(print.*name|typed.*name)/)) {
    return user.full_name
  }
  if (label.match(/(title|position)/)) {
    return org.executive_director ? 'Executive Director' : 'Authorized Representative'
  }
  
  // NARRATIVE/DESCRIPTION FIELDS
  if (label.match(/(need.*statement|problem.*description|challenge)/)) {
    return 'Our organization has identified critical community needs through comprehensive assessment and stakeholder engagement. This project addresses these needs through evidence-based approaches.'
  }
  if (label.match(/(sustainability.*plan|future.*funding)/)) {
    return 'This project includes a comprehensive sustainability plan with diversified funding strategies and capacity-building components to ensure long-term impact.'
  }
  if (label.match(/(partnership|collaboration|stakeholder)/)) {
    return 'We have established strong partnerships with key community stakeholders and will collaborate closely with local organizations to maximize project impact.'
  }
  
  // CHECKBOX/BOOLEAN FIELDS
  if (field.type === 'checkbox' && label.match(/(501.*c.*3|nonprofit|tax.*exempt)/)) {
    return org.organization_type === 'nonprofit' || org.organization_type === '501c3' ? '☑' : '☐'
  }
  if (field.type === 'checkbox' && label.match(/(agree|certify|attest)/)) {
    return '☑'
  }
  
  return null
}

// Keep the existing basicFieldMatch as a fallback, but rename it
function basicFieldMatch(field, userData) {
  return comprehensiveFieldMatch(field, userData)
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