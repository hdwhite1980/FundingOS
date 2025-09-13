/**
 * Document Analysis API Route
 * 
 * Server-side API endpoint for AI-powered document analysis
 * Uses hybrid AI provider system (OpenAI + Anthropic)
 */

import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'

const MAX_TOKENS = 4000

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Document analysis requires POST method with document content',
      supportedMethods: ['POST'],
      supportedActions: ['analyze', 'form-analysis', 'requirements-checklist', 'questions', 'batch-summary']
    },
    { status: 405 }
  )
}

export async function POST(request: NextRequest) {
  try {
    const { 
      documentText, 
      documentType = 'unknown', 
      context = {},
      action = 'analyze' // analyze, form-analysis, requirements-checklist, questions
    } = await request.json()

    if (!documentText && action === 'analyze') {
      return NextResponse.json(
        { error: 'Document text is required for analysis' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'analyze':
        result = await analyzeDocument(documentText, documentType, context)
        break
      case 'form-analysis':
        result = await analyzeApplicationForm(documentText, context.userProfile, context.projectData)
        break
      case 'requirements-checklist':
        result = await generateRequirementsChecklist(context.analysis, context.userProfile)
        break
      case 'questions':
        result = await generateClarifyingQuestions(context.formAnalysis, context)
        break
      case 'batch-summary':
        result = await generateBatchSummary(context.analyses)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('Document analysis API error:', error)
    return NextResponse.json(
      { 
        error: 'Document analysis failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function analyzeDocument(documentText: string, documentType: string, context: any) {
  const analysisPrompt = buildAnalysisPrompt(documentText, documentType, context)
  
  const response = await aiProviderService.generateCompletion(
    'document-analysis',
    [
      {
        role: 'system',
        content: getSystemPrompt(documentType)
      },
      {
        role: 'user',
        content: analysisPrompt
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

  const analysis = aiProviderService.safeParseJSON(response.content)
  
  return {
    ...analysis,
    metadata: {
      documentType,
      analyzedAt: new Date().toISOString(),
      tokensUsed: (response.usage as any)?.total_tokens || (response.usage as any)?.input_tokens + (response.usage as any)?.output_tokens || 0,
      confidence: calculateConfidence(analysis),
      processingTime: Date.now(),
      provider: response.provider,
      model: response.model
    }
  }
}

async function analyzeApplicationForm(formContent: string, userProfile: any, projectData: any) {
  const prompt = buildFormAnalysisPrompt(formContent, userProfile, projectData)
  
  const response = await aiProviderService.generateCompletion(
    'smart-form-completion',
    [
      {
        role: 'system',
        content: `You are an expert grant application assistant. Analyze application forms and provide intelligent completion suggestions based on the user's profile and project data. Always respond with valid JSON.`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    {
      maxTokens: MAX_TOKENS,
      temperature: 0.2,
      responseFormat: 'json_object'
    }
  )

  if (!response?.content) {
    throw new Error('No response received from AI provider')
  }

  return aiProviderService.safeParseJSON(response.content)
}

async function generateRequirementsChecklist(analysis: any, userProfile: any) {
  const prompt = `
Based on this document analysis and user profile, create a comprehensive requirements checklist:

DOCUMENT ANALYSIS:
${JSON.stringify(analysis, null, 2)}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

Create a detailed checklist with:
1. Required documents and information
2. Eligibility criteria with user's status
3. Deadline-driven action items
4. Recommended preparation steps
5. Risk factors and mitigation strategies

Format as JSON with requirements categorized by type and priority.
  `

  const response = await aiProviderService.generateCompletion(
    'document-analysis',
    [
      {
        role: 'system',
        content: 'You are a grant compliance expert. Create comprehensive, actionable requirement checklists. Always respond with valid JSON.'
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

async function generateClarifyingQuestions(formAnalysis: any, context: any) {
  const prompt = `
Based on this form analysis, generate intelligent, context-aware questions to gather missing information:

FORM ANALYSIS:
${JSON.stringify(formAnalysis, null, 2)}

CONTEXT:
${JSON.stringify(context, null, 2)}

Generate questions that are:
1. Specific and actionable
2. Prioritized by importance
3. Include helpful context/examples
4. Avoid redundant information we already have
5. Consider the user's business type and project

Format as JSON array with question objects containing: question, priority, category, helpText, and expectedAnswer type.
  `

  const response = await aiProviderService.generateCompletion(
    'smart-form-completion',
    [
      {
        role: 'system',
        content: 'You are an expert grant application consultant. Generate helpful, intelligent questions that guide users to provide exactly what\'s needed. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    {
      maxTokens: MAX_TOKENS,
      temperature: 0.3,
      responseFormat: 'json_object'
    }
  )

  if (!response?.content) {
    throw new Error('No response received from AI provider')
  }

  const result = aiProviderService.safeParseJSON(response.content)
  return result.questions || result
}

async function generateBatchSummary(analyses: any[]) {
  const prompt = `
Analyze these multiple document analyses and provide a consolidated summary:

${JSON.stringify(analyses, null, 2)}

Create a comprehensive summary that includes:
1. Overall funding opportunity overview
2. Combined requirements and deadlines
3. Strategic recommendations
4. Risk assessment
5. Next steps and priorities

Focus on actionable insights and avoid redundancy.
  `

  const response = await aiProviderService.generateCompletion(
    'document-analysis',
    [
      {
        role: 'system',
        content: 'You are a senior funding strategy consultant. Synthesize multiple document analyses into actionable strategic insights. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    {
      maxTokens: MAX_TOKENS,
      temperature: 0.2,
      responseFormat: 'json_object'
    }
  )

  if (!response?.content) {
    throw new Error('No response received from AI provider')
  }

  return aiProviderService.safeParseJSON(response.content)
}

function buildAnalysisPrompt(documentText: string, documentType: string, context: any) {
  // Ensure documentText is actually a string
  const textContent = typeof documentText === 'string' ? documentText : JSON.stringify(documentText)
  
  const basePrompt = `
Analyze this ${documentType} document and extract structured information. Focus on:

1. KEY INFORMATION:
   - Title, sponsor, program details
   - Funding amounts and cost sharing requirements
   - Application deadlines and important dates
   - Contact information

2. REQUIREMENTS ANALYSIS:
   - Eligibility criteria (organization type, size, location, etc.)
   - Required documents and submissions
   - Technical/project requirements
   - Compliance and reporting obligations

3. EVALUATION CRITERIA:
   - Scoring rubric and evaluation factors
   - Selection criteria and preferences
   - Success metrics and outcomes expected

4. STRATEGIC INSIGHTS:
   - Alignment with typical project types
   - Competitive positioning advice
   - Risk factors and challenges
   - Recommended approach/strategy

DOCUMENT CONTENT:
${textContent.substring(0, 12000)} ${textContent.length > 12000 ? '...[truncated]' : ''}
  `

  if (context.userProfile || context.project) {
    return basePrompt + `\n\nCONTEXT FOR PERSONALIZED ANALYSIS:\n${JSON.stringify(context, null, 2)}`
  }

  return basePrompt
}

function buildFormAnalysisPrompt(formContent: string, userProfile: any, projectData: any) {
  // Ensure formContent is actually a string
  const textContent = typeof formContent === 'string' ? formContent : JSON.stringify(formContent)
  
  return `
Analyze this application form and provide intelligent completion suggestions:

APPLICATION FORM:
${textContent.substring(0, 10000)}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

PROJECT DATA:
${JSON.stringify(projectData, null, 2)}

Provide:
1. COMPLETION SUGGESTIONS: Specific text/values for each field we can fill
2. MISSING INFORMATION: What we need from the user, organized by priority
3. QUESTIONS TO ASK: Intelligent questions to gather missing info
4. STRATEGIC RECOMMENDATIONS: How to best position this application
5. RISK ASSESSMENT: Potential issues and how to address them

Focus on maximizing the application's competitiveness while ensuring accuracy.
  `
}

function getSystemPrompt(documentType: string) {
  const basePrompt = `You are an expert grant and funding analyst with deep expertise in government grants, private foundations, venture funding, and corporate programs.`

  const typeSpecificPrompts: Record<string, string> = {
    'application': `${basePrompt} You specialize in analyzing application forms and requirements to help users complete them accurately and competitively.`,
    'rfp': `${basePrompt} You specialize in analyzing RFPs and funding announcements to extract requirements, deadlines, and strategic insights.`,
    'guidelines': `${basePrompt} You specialize in interpreting program guidelines and eligibility criteria to help users understand compliance requirements.`,
    'contract': `${basePrompt} You specialize in analyzing funding contracts and award documents to understand obligations and requirements.`,
    'report': `${basePrompt} You specialize in analyzing reports and documentation to understand reporting requirements and compliance needs.`
  }

  return typeSpecificPrompts[documentType] || basePrompt + ` Analyze any funding-related document to extract key information, requirements, and strategic insights. Always respond with valid, well-structured JSON.`
}

function calculateConfidence(analysis: any) {
  let score = 0.5 // Base confidence

  if (analysis.keyInformation) {
    if (analysis.keyInformation.title) score += 0.1
    if (analysis.keyInformation.sponsor) score += 0.1
    if (analysis.keyInformation.deadlines?.length > 0) score += 0.1
    if (analysis.keyInformation.fundingAmount) score += 0.1
  }

  if (analysis.requirements?.eligibility?.length > 0) score += 0.1
  if (analysis.requirements?.documents?.length > 0) score += 0.1
  if (analysis.evaluationCriteria?.length > 0) score += 0.1

  return Math.min(score, 1.0)
}