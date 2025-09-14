import aiProviderService from '../../../../lib/aiProviderService'

export async function POST(request) {
  try {
    const { applicationData, documentType = 'grant-application' } = await request.json()
    
    if (!applicationData?.opportunity || !applicationData?.project || !applicationData?.analysis) {
      return Response.json(
        { error: 'Missing required application data' },
        { status: 400 }
      )
    }

    const { opportunity, project, userProfile, analysis, applicationDraft, formTemplate } = applicationData

    // Enhanced form template detection - works with any dynamically extracted form structure
    let useFormTemplate = false
    let templateFields: any[] = []
    let formMetadata: any = {}

    // Helper function to convert form fields to standardized template format
    const convertToTemplateFields = (formFieldsObject: any, source: string) => {
      const fields = Object.entries(formFieldsObject).map(([key, fieldInfo]: [string, any]) => ({
        label: fieldInfo?.label || key.replace(/([A-Z])/g, ' $1').trim(),
        fieldName: key,
        type: fieldInfo?.type || 'text',
        required: fieldInfo?.required || false,
        placeholder: fieldInfo?.placeholder || fieldInfo?.description || '',
        section: fieldInfo?.section || 'General',
        validation: fieldInfo?.validation || {},
        options: fieldInfo?.options || [],
        dependencies: fieldInfo?.dependencies || []
      }))
      
      console.log(`📝 Using ${source} with ${fields.length} fields`)
      return fields
    }

    // Priority 1: Check for dynamic form analysis structure (new system)
    if (applicationData.dynamicFormStructure?.formFields) {
      useFormTemplate = true
      templateFields = convertToTemplateFields(applicationData.dynamicFormStructure.formFields, 'dynamic form analysis')
      formMetadata = applicationData.dynamicFormStructure.formMetadata || {}
    }
    // Priority 2: Check for direct formTemplate in applicationData (from Enhanced Application Tracker)
    else if (applicationData.formTemplate?.formFields) {
      useFormTemplate = true
      templateFields = convertToTemplateFields(applicationData.formTemplate.formFields, 'direct form template')
      formMetadata = applicationData.formTemplate.formMetadata || {}
    }
    // Priority 3: Check for uploaded form template (original flow)
    else if (formTemplate?.formFields && Object.keys(formTemplate.formFields).length > 0) {
      useFormTemplate = true
      templateFields = convertToTemplateFields(formTemplate.formFields, 'uploaded form template')
      formMetadata = formTemplate.formMetadata || {}
    }
    // Priority 4: Check for combined form fields from document analysis (legacy)
    else if (applicationData.combinedFormFields && Object.keys(applicationData.combinedFormFields).length > 0) {
      useFormTemplate = true
      templateFields = convertToTemplateFields(applicationData.combinedFormFields, 'combined form fields')
    }

    // Create comprehensive prompt for document generation with enhanced dynamic form support
    const systemMessage = {
      role: 'system',
      content: useFormTemplate ? 
        `You are an expert grant application writer specializing in completing ANY type of application form based on dynamically extracted form structures.

CRITICAL REQUIREMENTS:
1. You MUST fill out the EXACT form fields provided - do not add, skip, or modify any fields
2. Field names and labels must match the extracted structure exactly
3. Write professional responses appropriate for each field type and context
4. Consider field validation rules, dependencies, and constraints
5. Maintain the original form organization by sections
6. Fill all required fields with substantive content, optionally fill others where appropriate

FORM TYPE DETECTED: ${formMetadata.documentType || 'Unknown'}
FORM TITLE: ${formMetadata.title || 'Application Form'}
ORGANIZATION: ${formMetadata.organization || 'N/A'}

FIELD TYPES TO HANDLE:
- TEXT: Short responses (names, titles, single-line info)
- TEXTAREA: Long responses (descriptions, narratives, explanations) 
- EMAIL: Valid email addresses
- PHONE: Properly formatted phone numbers
- DATE: Formatted dates (MM/DD/YYYY or as specified)
- CURRENCY: Dollar amounts with proper formatting
- NUMBER: Numeric values (quantities, percentages)
- SELECT/RADIO: Choose from provided options
- CHECKBOX: Select relevant options or Yes/No
- FILE: Indicate what would be attached

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "formFields": [
    {
      "fieldName": "exact_field_name_from_structure",
      "label": "Exact Field Label",
      "value": "Professional response tailored to field type and purpose",
      "type": "field_type",
      "section": "section_name"
    }
  ],
  "metadata": {
    "title": "${formMetadata.title || 'Application Form'}",
    "applicant": "Organization name",
    "date": "Current date",
    "templateUsed": true,
    "formType": "${formMetadata.documentType || 'unknown'}",
    "totalFields": ${templateFields.length},
    "requiredFields": ${templateFields.filter(f => f.required).length}
  }
}

FORM STRUCTURE TO COMPLETE:
${templateFields.map(field => {
  let fieldDesc = `• ${field.label} (${field.fieldName}) - Type: ${field.type}`
  if (field.required) fieldDesc += ' [REQUIRED]'
  if (field.validation?.maxLength) fieldDesc += ` (Max: ${field.validation.maxLength} chars)`
  if (field.options?.length) fieldDesc += ` Options: ${field.options.join(', ')}`
  if (field.placeholder) fieldDesc += ` - ${field.placeholder}`
  return fieldDesc
}).join('\n')}

SECTIONS ORGANIZATION:
${templateFields.reduce((sections: any, field) => {
  if (!sections[field.section]) sections[field.section] = []
  sections[field.section].push(field.fieldName)
  return sections
}, {})}

IMPORTANT: Each field value should be:
- Professional and appropriate for the detected form type
- Specific to the provided project and opportunity
- Written by an experienced professional in the relevant domain
- Appropriate for the field type, length constraints, and context
- Complete and substantive (no placeholder text or "TBD")
- Compliant with any validation rules or format requirements`
        :
        `You are an expert application writer. Generate a complete, professional application document.

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "formFields": [
    {
      "fieldName": "field_identifier",
      "label": "Field Display Name",
      "value": "Professional response content",
      "type": "text|textarea",
      "section": "section_name"
    }
  ],
  "metadata": {
    "title": "Application Document",
    "applicant": "Organization Name",
    "date": "Current Date",
    "templateUsed": false
  }
}

Generate comprehensive form fields covering all aspects of a professional application:
1. Basic Information (organization, contact, project details)
2. Project Description (goals, objectives, methodology)  
3. Need Statement and Impact
4. Timeline, Budget, and Resources
5. Organizational Capacity and Experience
6. Evaluation and Sustainability Plans

Each response should be professional, detailed, and tailored to the specific project and opportunity.`
    }

    const userMessage = {
      role: 'user',
      content: `${useFormTemplate ? 
        'Fill out the uploaded form template with the following information:' : 
        'Generate a complete grant application document with the following information:'}

OPPORTUNITY DETAILS:
- Title: ${opportunity.title}
- Sponsor: ${opportunity.sponsor}
- Funding Amount: $${opportunity.amount_min?.toLocaleString()} - $${opportunity.amount_max?.toLocaleString()}
- Deadline: ${opportunity.deadline_date || 'Rolling'}
- Description: ${opportunity.description || 'Standard grant opportunity'}
- Requirements: ${opportunity.eligibility_requirements || 'Standard eligibility applies'}

PROJECT DETAILS:
- Name: ${project.name}
- Type: ${project.project_type?.replace('_', ' ')}
- Description: ${project.description || 'Innovative project seeking funding'}
- Goals: ${project.goals || 'Advance project objectives'}
- Budget: ${project.budget ? `$${project.budget.toLocaleString()}` : 'To be determined'}
- Timeline: ${project.timeline || '12-24 months'}

ORGANIZATION DETAILS:
- Organization: ${userProfile?.organization_name || 'Organization'}
- Contact: ${userProfile?.full_name || 'Project Lead'}
- Location: ${userProfile?.location || 'Location TBD'}

AI ANALYSIS INSIGHTS:
- Fit Score: ${analysis.fitScore}%
- Key Strengths: ${analysis.strengths?.join(', ') || 'Project alignment'}
- Challenges: ${analysis.challenges?.join(', ') || 'Standard challenges'}
- Recommendations: ${analysis.recommendations?.join(', ') || 'Follow best practices'}
- Next Steps: ${analysis.nextSteps?.join(', ') || 'Proceed with application'}
- AI Reasoning: ${analysis.reasoning || 'Good match for funding'}

${useFormTemplate ? 
  `\nFORM TEMPLATE STRUCTURE:\n${templateFields.map(field => 
    `${field.label} (${field.type}${field.required ? ', Required' : ', Optional'})${field.placeholder ? ' - ' + field.placeholder : ''}`
  ).join('\n')}\n\nPlease fill out each field from the template above with appropriate content based on the project and opportunity information provided.` 
  : ''
}

${applicationDraft ? `EXISTING DRAFT CONTENT:
${applicationDraft}

Please enhance and complete this draft with the above information.` : ''}

${useFormTemplate ? 
  'Fill out the form template exactly as provided, ensuring all required fields are completed with professional, compelling content.' :
  'Create a complete, professional grant application document that addresses all requirements and incorporates the AI analysis insights.'
}`
    }

    console.log('🤖 Generating grant application document...')

    const result = await aiProviderService.generateCompletion(
      'document-analysis',
      [systemMessage, userMessage],
      {
        maxTokens: 4000, // Reduced to work with Claude Haiku's 4096 limit
        temperature: 0.3
      }
    )

    console.log('Document generation result:', result)

    if (!result?.content) {
      throw new Error('No document content generated')
    }

    // Parse the JSON response
    const documentData = aiProviderService.safeParseJSON(result.content)
    
    if (!documentData.formFields || !Array.isArray(documentData.formFields)) {
      throw new Error('Generated response missing form fields data')
    }

    console.log('✅ Grant application form data generated successfully')

    return Response.json({
      success: true,
      formFields: documentData.formFields,
      metadata: documentData.metadata || {
        title: 'Grant Application',
        applicant: userProfile?.full_name || 'Applicant',
        date: new Date().toLocaleDateString()
      },
      applicationInfo: {
        opportunityTitle: opportunity.title,
        projectName: project.name,
        fitScore: analysis.fitScore,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Document generation error:', error)
    
    return Response.json(
      { 
        error: 'Document generation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}