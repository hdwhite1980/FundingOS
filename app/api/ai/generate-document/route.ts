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
        `You are an expert grant application writer. Fill out the EXACT form template that was uploaded and analyzed.

CRITICAL: You MUST respond with valid JSON only containing the specific form fields from the uploaded template. The JSON should have this exact structure:
{
  "formFields": [
    {
      "label": "EXACT_FIELD_LABEL_FROM_TEMPLATE",
      "value": "Professional response written as if typed by experienced grant writer",
      "type": "text/textarea",
      "fieldName": "original_field_name"
    }
  ],
  "metadata": {
    "title": "Grant Application",
    "applicant": "Applicant Name",
    "date": "Current Date",
    "templateUsed": true
  }
}

FORM TEMPLATE FIELDS TO FILL:
${templateFields.map(field => `- ${field.label} (${field.type}) ${field.required ? '[REQUIRED]' : '[OPTIONAL]'}`).join('\n')}

Each field value should be written as professional, formal responses that sound like they were typed by an experienced grant writer. Make responses specific to the provided project and opportunity data. DO NOT add any fields that are not in the template above.`
        :
        `You are an expert grant application writer. Generate a complete, professional grant application with structured form-like data.

CRITICAL: You MUST respond with valid JSON only containing structured form fields. The JSON should have this exact structure:
{
  "formFields": [
    {
      "label": "Project Title",
      "value": "Generated project title response",
      "type": "text"
    },
    {
      "label": "Executive Summary",
      "value": "2-3 paragraph executive summary written as if typed by applicant",
      "type": "textarea"
    }
  ],
  "metadata": {
    "title": "Grant Application",
    "applicant": "Applicant Name",
    "date": "Current Date",
    "templateUsed": false
  }
}

Generate form fields for a complete grant application including:
1. Project Title - Clear, compelling title
2. Executive Summary - 2-3 paragraphs overview
3. Project Description - Detailed description (3-4 paragraphs)
4. Statement of Need - Problem statement and justification
5. Project Goals and Objectives - Specific, measurable goals
6. Methodology/Approach - How the project will be executed
7. Timeline - Project phases and milestones
8. Budget Justification - Funding breakdown and rationale
9. Evaluation Plan - How success will be measured
10. Organizational Capacity - Qualifications and experience
11. Impact Statement - Expected outcomes and broader impact
12. Sustainability Plan - How project will continue beyond funding

Each field value should be written as professional, formal responses that sound like they were typed by an experienced grant writer. Make responses specific to the provided project and opportunity data.`
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