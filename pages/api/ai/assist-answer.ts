/**
 * AI Writing Assistant API - Helps users write better form responses
 * /api/ai/assist-answer
 */

import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../lib/aiProviderService.js'

export async function POST(request: NextRequest) {
  try {
    const { 
      field, 
      question, 
      userInput, 
      projectData, 
      userProfile, 
      assistanceType,
      context 
    } = await request.json()

    if (!field || !question) {
      return NextResponse.json(
        { success: false, error: 'Field and question are required' },
        { status: 400 }
      )
    }

    console.log('✍️ AI writing assistance requested:', {
      fieldId: field.id,
      assistanceType: assistanceType || 'general',
      hasUserInput: !!userInput,
      hasProjectData: !!projectData
    })

    let assistanceResult

    switch (assistanceType) {
      case 'generate_draft':
        assistanceResult = await generateDraftResponse(field, question, projectData, userProfile, context)
        break
      case 'improve_answer':
        assistanceResult = await improveExistingAnswer(field, question, userInput, projectData, context)
        break
      case 'analyze_requirements':
        assistanceResult = await analyzeQuestionRequirements(field, question, context)
        break
      case 'suggest_improvements':
        assistanceResult = await suggestImprovements(field, question, userInput, context)
        break
      default:
        assistanceResult = await provideGeneralAssistance(field, question, userInput, projectData, userProfile, context)
    }

    const response = {
      success: true,
      data: {
        assistance: assistanceResult,
        field: {
          id: field.id,
          label: field.label,
          type: field.type
        },
        timestamp: new Date().toISOString()
      }
    }

    console.log('✅ AI assistance provided:', {
      type: assistanceType,
      responseLength: assistanceResult.response?.length || 0,
      confidence: assistanceResult.confidence
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('AI writing assistance error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'AI assistance failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

async function generateDraftResponse(field: any, question: string, projectData: any, userProfile: any, context: any) {
  const prompt = buildDraftGenerationPrompt(field, question, projectData, userProfile, context)
  
  const aiResponse = await aiProviderService.generateCompletion(
    'draft-generation',
    [
      {
        role: 'system',
        content: prompt.system
      },
      {
        role: 'user',
        content: prompt.user
      }
    ],
    {
      temperature: 0.3,
      max_tokens: 2000
    }
  )

  const responseContent = String(aiResponse?.content || aiResponse)
  
  return {
    type: 'draft_response',
    response: responseContent,
    confidence: 0.8,
    suggestions: [
      'Review and personalize this draft',
      'Add specific examples from your experience',
      'Ensure it matches your organization\'s voice'
    ],
    wordCount: responseContent.split(' ').length,
    editableAreas: identifyEditableAreas(responseContent)
  }
}

async function improveExistingAnswer(field: any, question: string, userInput: string, projectData: any, context: any) {
  const prompt = buildImprovementPrompt(field, question, userInput, projectData, context)
  
  const aiResponse = await aiProviderService.generateCompletion(
    'answer-improvement',
    [
      {
        role: 'system',
        content: prompt.system
      },
      {
        role: 'user',
        content: prompt.user
      }
    ],
    {
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    }
  )

  const responseContent = aiResponse?.content || aiResponse
  let improvementResult

  try {
    improvementResult = JSON.parse(String(responseContent))
  } catch (parseError) {
    // Fallback to text response
    improvementResult = {
      improved_response: String(responseContent),
      improvements: ['General improvements applied'],
      confidence: 0.7
    }
  }

  return {
    type: 'improved_response',
    response: improvementResult.improved_response || userInput,
    originalResponse: userInput,
    improvements: improvementResult.improvements || [],
    confidence: improvementResult.confidence || 0.7,
    changesSummary: improvementResult.changes_summary || 'Response enhanced for clarity and completeness'
  }
}

async function analyzeQuestionRequirements(field: any, question: string, context: any) {
  const prompt = buildAnalysisPrompt(field, question, context)
  
  const aiResponse = await aiProviderService.generateCompletion(
    'requirement-analysis',
    [
      {
        role: 'system',
        content: prompt.system
      },
      {
        role: 'user',
        content: prompt.user
      }
    ],
    {
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    }
  )

  const responseContent = aiResponse?.content || aiResponse
  let analysisResult

  try {
    analysisResult = JSON.parse(String(responseContent))
  } catch (parseError) {
    analysisResult = {
      key_requirements: ['Answer the question thoroughly'],
      evaluation_criteria: ['Completeness', 'Relevance', 'Clarity'],
      recommended_approach: 'Provide a comprehensive response',
      word_count_guidance: 'Follow any specified limits'
    }
  }

  return {
    type: 'requirement_analysis',
    keyRequirements: analysisResult.key_requirements || [],
    evaluationCriteria: analysisResult.evaluation_criteria || [],
    recommendedApproach: analysisResult.recommended_approach || '',
    wordCountGuidance: analysisResult.word_count_guidance || '',
    exampleElements: analysisResult.example_elements || [],
    confidence: 0.9
  }
}

async function suggestImprovements(field: any, question: string, userInput: string, context: any) {
  const prompt = buildSuggestionPrompt(field, question, userInput, context)
  
  const aiResponse = await aiProviderService.generateCompletion(
    'improvement-suggestions',
    [
      {
        role: 'system',
        content: prompt.system
      },
      {
        role: 'user',
        content: prompt.user
      }
    ],
    {
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    }
  )

  const responseContent = aiResponse?.content || aiResponse
  let suggestionResult

  try {
    suggestionResult = JSON.parse(String(responseContent))
  } catch (parseError) {
    suggestionResult = {
      suggestions: ['Consider adding more specific details'],
      strengths: ['Response addresses the question'],
      areas_for_improvement: ['Could be more detailed']
    }
  }

  return {
    type: 'improvement_suggestions',
    suggestions: suggestionResult.suggestions || [],
    strengths: suggestionResult.strengths || [],
    areasForImprovement: suggestionResult.areas_for_improvement || [],
    overallScore: suggestionResult.overall_score || 7,
    confidence: 0.85
  }
}

async function provideGeneralAssistance(field: any, question: string, userInput: string, projectData: any, userProfile: any, context: any) {
  // Determine the best type of assistance based on the situation
  if (!userInput) {
    return await generateDraftResponse(field, question, projectData, userProfile, context)
  } else if (userInput.length < 50) {
    return await analyzeQuestionRequirements(field, question, context)
  } else {
    return await suggestImprovements(field, question, userInput, context)
  }
}

function buildDraftGenerationPrompt(field: any, question: string, projectData: any, userProfile: any, context: any) {
  return {
    system: `You are an expert grant writer and application specialist. Your job is to help users write compelling, professional responses to application questions.

You have access to:
- The specific question being asked
- The user's project information
- Their organization profile
- Context about the application

Write responses that are:
- Professional and well-structured
- Tailored to the specific question
- Based on the provided project/organization data
- Appropriate in length and detail
- Compelling but honest

Always write in a professional tone suitable for grant applications, loan applications, or formal registration documents.`,

    user: `Write a draft response for this application question:

QUESTION: ${question}

FIELD INFORMATION:
- Field Type: ${field.type}
- Required: ${field.required ? 'Yes' : 'No'}
- Word Limit: ${field.wordLimit || 'Not specified'}
- Help Text: ${field.helpText || 'None'}

PROJECT DATA:
${projectData ? JSON.stringify(projectData, null, 2) : 'No project data available'}

USER/ORGANIZATION INFO:
${userProfile ? JSON.stringify(userProfile, null, 2) : 'No user profile available'}

ADDITIONAL CONTEXT:
${context ? JSON.stringify(context, null, 2) : 'No additional context'}

Please write a professional, comprehensive draft response that addresses the question using the available information. If information is missing, use placeholders like [INSERT SPECIFIC EXAMPLE] that the user can fill in.`
  }
}

function buildImprovementPrompt(field: any, question: string, userInput: string, projectData: any, context: any) {
  return {
    system: `You are an expert application reviewer and writing coach. Your job is to improve user responses to make them more compelling, clear, and complete.

Return your analysis as JSON with this structure:
{
  "improved_response": "The enhanced version of their response",
  "improvements": ["List of specific improvements made"],
  "confidence": 0.8,
  "changes_summary": "Brief summary of what was changed"
}`,

    user: `Improve this response to make it more compelling and complete:

QUESTION: ${question}

CURRENT RESPONSE:
${userInput}

FIELD REQUIREMENTS:
- Required: ${field.required ? 'Yes' : 'No'}
- Word Limit: ${field.wordLimit || 'Not specified'}
- Help Text: ${field.helpText || 'None'}

PROJECT CONTEXT:
${projectData ? JSON.stringify(projectData, null, 2) : 'Limited context available'}

Please enhance this response while maintaining the user's voice and intent. Focus on clarity, completeness, and persuasiveness.`
  }
}

function buildAnalysisPrompt(field: any, question: string, context: any) {
  return {
    system: `You are an expert application analyst. Your job is to break down questions and help users understand what's being asked and how to answer effectively.

Return your analysis as JSON with this structure:
{
  "key_requirements": ["What the question is really asking for"],
  "evaluation_criteria": ["How responses will likely be evaluated"],
  "recommended_approach": "Strategy for answering effectively",
  "word_count_guidance": "Recommended response length",
  "example_elements": ["Specific elements that should be included"]
}`,

    user: `Analyze this application question and provide guidance:

QUESTION: ${question}

FIELD INFORMATION:
- Field Type: ${field.type}
- Required: ${field.required ? 'Yes' : 'No'}
- Word Limit: ${field.wordLimit || 'Not specified'}
- Help Text: ${field.helpText || 'None'}

CONTEXT:
${context ? JSON.stringify(context, null, 2) : 'Standard application context'}

Help the user understand what this question is really asking for and how to answer it effectively.`
  }
}

function buildSuggestionPrompt(field: any, question: string, userInput: string, context: any) {
  return {
    system: `You are an expert writing coach specializing in application responses. Analyze the user's response and provide specific, actionable suggestions for improvement.

Return your analysis as JSON with this structure:
{
  "suggestions": ["Specific actionable improvements"],
  "strengths": ["What's working well in the response"],
  "areas_for_improvement": ["Areas that need work"],
  "overall_score": 8
}`,

    user: `Analyze this response and provide improvement suggestions:

QUESTION: ${question}

USER'S RESPONSE:
${userInput}

FIELD REQUIREMENTS:
- Word Limit: ${field.wordLimit || 'Not specified'}
- Help Text: ${field.helpText || 'None'}

Provide specific, actionable suggestions to make this response stronger and more compelling.`
  }
}

function identifyEditableAreas(response: string): string[] {
  const editableAreas: string[] = []
  
  // Look for placeholder patterns
  const placeholders = response.match(/\[.*?\]/g)
  if (placeholders) {
    editableAreas.push(...placeholders)
  }
  
  // Look for generic terms that should be personalized
  const genericTerms = ['our organization', 'our project', 'our team', 'this initiative']
  genericTerms.forEach(term => {
    if (response.toLowerCase().includes(term)) {
      editableAreas.push(`Consider personalizing "${term}"`)
    }
  })
  
  return editableAreas
}