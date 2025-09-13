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

    const { opportunity, project, userProfile, analysis, applicationDraft } = applicationData

    // Create comprehensive prompt for document generation
    const systemMessage = {
      role: 'system',
      content: `You are an expert grant application writer. Generate a complete, professional grant application document based on the provided data. The document should be in a format ready for submission.

CRITICAL: You MUST respond with valid JSON only containing the document content. The JSON should have this exact structure:
{
  "document": "FULL_DOCUMENT_CONTENT_HERE",
  "sections": {
    "executive_summary": "...",
    "project_description": "...",
    "budget": "...",
    "timeline": "...",
    "evaluation": "..."
  }
}

Create a professional, compelling grant application that:
1. Uses formal grant application language and structure
2. Incorporates all AI analysis insights and recommendations
3. Addresses potential concerns identified in the analysis
4. Highlights project strengths and alignment with funding goals
5. Includes specific, actionable project details
6. Is formatted for easy reading and submission

Make the document comprehensive, professional, and submission-ready.`
    }

    const userMessage = {
      role: 'user',
      content: `Generate a complete grant application document with the following information:

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

${applicationDraft ? `EXISTING DRAFT CONTENT:
${applicationDraft}

Please enhance and complete this draft with the above information.` : ''}

Create a complete, professional grant application document that addresses all requirements and incorporates the AI analysis insights.`
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
    
    if (!documentData.document) {
      throw new Error('Generated response missing document content')
    }

    console.log('✅ Grant application document generated successfully')

    return Response.json({
      success: true,
      document: documentData.document,
      sections: documentData.sections || {},
      metadata: {
        generatedAt: new Date().toISOString(),
        opportunityTitle: opportunity.title,
        projectName: project.name,
        fitScore: analysis.fitScore
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