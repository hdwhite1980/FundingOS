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

    // Check if we have a form template (from uploaded and analyzed documents)
    let useFormTemplate = false
    let templateFields: any[] = []

    if (formTemplate && formTemplate.formFields && Object.keys(formTemplate.formFields).length > 0) {
      useFormTemplate = true
      // Convert the form fields object to array format
      templateFields = Object.entries(formTemplate.formFields).map(([key, fieldInfo]: [string, any]) => ({
        label: fieldInfo?.label || key.replace(/([A-Z])/g, ' $1').trim(),
        fieldName: key,
        type: fieldInfo?.type || 'text',
        required: fieldInfo?.required || false,
        placeholder: fieldInfo?.placeholder || fieldInfo?.description || ''
      }))
      
      console.log('🔧 Using uploaded form template with', templateFields.length, 'fields')
    }

    // Create comprehensive prompt for document generation
    const systemMessage = {
      role: 'system',
      content: useFormTemplate ? 
        `You are an expert grant application writer specializing in completing official grant application forms exactly as they appear in the original template.

CRITICAL REQUIREMENTS:
1. You MUST fill out the EXACT form fields from the uploaded template - do not add or skip any fields
2. Field names and labels must match the template exactly
3. Write professional responses as if typed by an experienced grant writer
4. Maintain the original form structure and organization
5. Fill every required field with appropriate, substantive content

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "formFields": [
    {
      "fieldName": "exact_field_name_from_template",
      "label": "Exact Field Label from Template",
      "value": "Professional, detailed response written as if by experienced grant writer",
      "type": "field_type",
      "section": "section_name"
    }
  ],
  "metadata": {
    "title": "Form title from template",
    "applicant": "Organization name",
    "date": "Current date",
    "templateUsed": true,
    "originalTemplate": "template_name"
  }
}

FORM TEMPLATE TO FILL OUT:
${templateFields.map(field => 
  `• ${field.label} (${field.fieldName}) - Type: ${field.type} ${field.required ? '[REQUIRED]' : '[OPTIONAL]'}`
).join('\n')}

IMPORTANT: Each field value should be:
- Professional and compelling
- Specific to the provided project and opportunity
- Written in the voice of an experienced grant writer
- Appropriate for the field type and context
- Complete and substantive (no placeholder text)`
        :
        `You are an expert grant application writer. Generate a complete, professional grant application document.

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
    "title": "Grant Application",
    "applicant": "Organization Name",
    "date": "Current Date",
    "templateUsed": false
  }
}

Generate comprehensive form fields covering:
1. Project Title, Summary, Description
2. Statement of Need, Goals, Objectives  
3. Methodology, Timeline, Budget
4. Organizational Capacity, Evaluation Plan
5. Impact Statement, Sustainability Plan

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
        maxTokens: 8000,
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