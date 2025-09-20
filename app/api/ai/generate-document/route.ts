import aiProviderService from '../../../../lib/aiProviderService'
import { buildOrgContext } from '../../../../lib/ai/contextBuilder'

export async function POST(request) {
  try {
    const requestData = await request.json()
    let { userId, projectId, opportunityId, applicationData, documentType = 'grant-application' } = requestData
    
    // Handle backward compatibility - if called with old applicationData format
    if (!userId && applicationData?.userProfile?.user_id) {
      userId = applicationData.userProfile.user_id
    }
    if (!projectId && applicationData?.project?.id) {
      projectId = applicationData.project.id
    }
    if (!opportunityId && applicationData?.opportunity?.id) {
      opportunityId = applicationData.opportunity.id
    }
    
    // Validate required parameters
    if (!userId) {
      return Response.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    if (!projectId || !opportunityId) {
      return Response.json(
        { error: 'Project ID and Opportunity ID are required' },
        { status: 400 }
      )
    }

    console.log('🚀 AI Application Generation:', { userId, projectId, opportunityId })

    // Build comprehensive context from Supabase
    console.log('📊 Building user/org context from Supabase...')
    const context = await buildOrgContext(userId)
    console.log('✅ Context built successfully:', {
      hasProfile: !!context.profile,
      projectCount: context.projects?.length || 0,
      applicationCount: context.applications?.length || 0,
      opportunityCount: context.opportunities?.length || 0
    })

    // Find the specific project and opportunity from context
    const project = context.projects?.find(p => p.id === projectId)
    const opportunity = context.opportunities?.find(o => o.id === opportunityId)
    
    if (!project) {
      return Response.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }
    
    if (!opportunity) {
      return Response.json(
        { error: 'Opportunity not found or access denied' },
        { status: 404 }
      )
    }

    // Use context data instead of passed applicationData, but allow fallback to passed data
    const userProfile = context.profile
    const analysis = applicationData?.analysis || {
      fitScore: 85,
      strengths: ['Strong project alignment'],
      challenges: ['Standard application requirements'],
      recommendations: ['Follow application guidelines'],
      nextSteps: ['Complete application'],
      reasoning: 'AI analysis based on current context'
    }
    
    const { applicationDraft, formTemplate } = applicationData || {}

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
    if (applicationData?.dynamicFormStructure?.formFields) {
      useFormTemplate = true
      templateFields = convertToTemplateFields(applicationData.dynamicFormStructure.formFields, 'dynamic form analysis')
      formMetadata = applicationData.dynamicFormStructure.formMetadata || {}
    }
    // Priority 2: Check for direct formTemplate in applicationData (from Enhanced Application Tracker)
    else if (applicationData?.formTemplate?.formFields) {
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
    else if (applicationData?.combinedFormFields && Object.keys(applicationData.combinedFormFields).length > 0) {
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

ORGANIZATION PROFILE DATA AVAILABLE:
- Organization: ${userProfile?.organization_name || userProfile?.full_name || 'Organization Name'}
- Tax ID/EIN: ${userProfile?.tax_id || userProfile?.ein || 'Not specified'}
- Address: ${userProfile?.address || userProfile?.location || 'Address not specified'}
- Email: ${userProfile?.email || 'Contact email'}
- Annual Budget: ${userProfile?.annual_budget ? `$${userProfile.annual_budget.toLocaleString()}` : 'Not specified'}
- Years Operating: ${userProfile?.years_in_operation || userProfile?.years_operating || 'Not specified'}
- Staff Count: ${userProfile?.full_time_staff || userProfile?.employee_count || 'Not specified'}
- Board Size: ${userProfile?.board_size || userProfile?.board_members || 'Not specified'}

FORM TYPE DETECTED: ${formMetadata.documentType || 'Unknown'}
FORM TITLE: ${formMetadata.title || 'Application Form'}
ORGANIZATION: ${formMetadata.organization || 'N/A'}

FIELD TYPES TO HANDLE:
- TEXT: Short responses (names, titles, single-line info) - USE PROFILE DATA WHERE APPROPRIATE
- TEXTAREA: Long responses (descriptions, narratives, explanations) 
- EMAIL: Valid email addresses - USE PROFILE EMAIL: ${userProfile?.email || 'email@organization.org'}
- PHONE: Properly formatted phone numbers - USE PROFILE PHONE: ${userProfile?.phone || '(555) 123-4567'}
- DATE: Formatted dates (MM/DD/YYYY or as specified)
- CURRENCY: Dollar amounts with proper formatting - USE PROFILE BUDGET DATA WHERE RELEVANT
- NUMBER: Numeric values (quantities, percentages) - USE PROFILE DATA (staff, years, etc.)
- SELECT/RADIO: Choose from provided options
- CHECKBOX: Select relevant options or Yes/No
- FILE: Indicate what would be attached

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "formFields": [
    {
      "fieldName": "exact_field_name_from_structure",
      "label": "Exact Field Label",
      "value": "Professional response tailored to field type and purpose, using profile data where applicable",
      "type": "field_type",
      "section": "section_name"
    }
  ],
  "metadata": {
    "title": "${formMetadata.title || 'Application Form'}",
    "applicant": "${userProfile?.organization_name || userProfile?.full_name || 'Organization'}",
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
${JSON.stringify(templateFields.reduce((sections: any, field) => {
  if (!sections[field.section]) sections[field.section] = []
  sections[field.section].push(field.fieldName)
  return sections
}, {}), null, 2)}

IMPORTANT: Each field value should be:
- Professional and appropriate for the detected form type
- Specific to the provided project and opportunity
- Written by an experienced professional in the relevant domain
- Appropriate for the field type, length constraints, and context
- Complete and substantive (no placeholder text or "TBD")
- Compliant with any validation rules or format requirements
- USE ACTUAL PROFILE DATA (organization name, EIN, address, etc.) for organizational fields`
        :
        `You are an expert application writer. Generate a complete, professional application document using the organization's profile data.

ORGANIZATION PROFILE DATA:
- Organization: ${userProfile?.organization_name || userProfile?.full_name || 'Organization Name'}
- Tax ID/EIN: ${userProfile?.tax_id || userProfile?.ein || 'Not specified'}
- Address: ${userProfile?.address || userProfile?.location || 'Address not specified'}  
- Email: ${userProfile?.email || 'Contact email'}
- Annual Budget: ${userProfile?.annual_budget ? `$${userProfile.annual_budget.toLocaleString()}` : 'Not specified'}
- Years Operating: ${userProfile?.years_in_operation || userProfile?.years_operating || 'Not specified'}
- Staff Count: ${userProfile?.full_time_staff || userProfile?.employee_count || 'Not specified'}
- Board Size: ${userProfile?.board_size || userProfile?.board_members || 'Not specified'}

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "formFields": [
    {
      "fieldName": "field_identifier",
      "label": "Field Display Name",
      "value": "Professional response content using profile data where appropriate",
      "type": "text|textarea",
      "section": "section_name"
    }
  ],
  "metadata": {
    "title": "Application Document",
    "applicant": "${userProfile?.organization_name || userProfile?.full_name || 'Organization'}",
    "date": "Current Date",
    "templateUsed": false
  }
}

Generate comprehensive form fields covering all aspects of a professional application:
1. Basic Information (organization, contact, project details) - USE PROFILE DATA
2. Project Description (goals, objectives, methodology)  
3. Need Statement and Impact
4. Timeline, Budget, and Resources
5. Organizational Capacity and Experience - USE PROFILE DATA (years operating, staff, budget)
6. Evaluation and Sustainability Plans

Each response should be professional, detailed, and tailored to the specific project and opportunity, incorporating the organization's actual profile information.`
    }

    const userMessage = {
      role: 'user',
      content: `${useFormTemplate ? 
        'Fill out the uploaded form template with the following information (using profile data for organizational fields):' : 
        'Generate a complete grant application document with the following information (incorporating profile data):'}

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

ORGANIZATION DETAILS (USE THIS DATA FOR ORGANIZATIONAL FIELDS):
- Organization: ${userProfile?.organization_name || userProfile?.full_name || 'Organization'}
- Tax ID/EIN: ${userProfile?.tax_id || userProfile?.ein || 'Not specified'}
- Address: ${userProfile?.address || userProfile?.location || 'Address not provided'}
- Email: ${userProfile?.email || 'Contact email'}
- Phone: ${userProfile?.phone || 'Phone number'}
- Annual Budget: ${userProfile?.annual_budget ? `$${userProfile.annual_budget.toLocaleString()}` : 'Not specified'}
- Years Operating: ${userProfile?.years_in_operation || userProfile?.years_operating || 'Not specified'}
- Staff Count: ${userProfile?.full_time_staff || userProfile?.employee_count || 'Not specified'}
- Board Size: ${userProfile?.board_size || userProfile?.board_members || 'Not specified'}
- Executive Director: ${userProfile?.executive_director || userProfile?.director_name || 'Not specified'}
- Board President: ${userProfile?.board_president || userProfile?.board_chair || 'Not specified'}

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
  ).join('\n')}\n\nPlease fill out each field from the template above with appropriate content based on the project and opportunity information provided. For organizational fields (name, address, EIN, etc.), USE THE ORGANIZATION DETAILS provided above.` 
  : ''
}

${applicationDraft ? `EXISTING DRAFT CONTENT:
${applicationDraft}

Please enhance and complete this draft with the above information.` : ''}

${useFormTemplate ? 
  'Fill out the form template exactly as provided, ensuring all required fields are completed with professional, compelling content. Use the actual organization profile data for any organizational/contact fields.' :
  'Create a complete, professional grant application document that addresses all requirements and incorporates the AI analysis insights and organization profile data.'
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