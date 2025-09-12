/**
 * Smart Form Completion API Route
 * 
 * Server-side API endpoint for AI-powered form completion assistance
 */

import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MAX_TOKENS = 4000
const MODEL = 'gpt-4-turbo' // Good balance for form completion tasks

function safeParseResponse(content: string | null): any {
  if (!content) throw new Error('No content received from OpenAI')
  return JSON.parse(content)
}

export async function POST(request: NextRequest) {
  try {
    const { 
      formFields,
      userProfile,
      projectData,
      missingFields,
      action = 'complete-form' // complete-form, create-completion-plan, generate-narratives
    } = await request.json()

    let result

    switch (action) {
      case 'complete-form':
        result = await completeFormFields(formFields, userProfile, projectData)
        break
      case 'create-completion-plan':
        result = await createCompletionPlan(formFields, { userProfile, projectData })
        break
      case 'generate-narratives':
        result = await generateNarrativeContent(formFields, userProfile, projectData)
        break
      case 'detect-missing-info':
        result = await detectMissingInformation(formFields, userProfile, projectData)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('Smart form completion API error:', error)
    return NextResponse.json(
      { 
        error: 'Form completion failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function completeFormFields(formFields: any, userProfile: any, projectData: any) {
  const prompt = `
You are an expert grant application assistant. Complete the following form fields using the provided user and project information.

FORM FIELDS TO COMPLETE:
${JSON.stringify(formFields, null, 2)}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

PROJECT DATA:
${JSON.stringify(projectData, null, 2)}

For each form field, provide:
1. A completed value based on the available information
2. Confidence level (0.0-1.0) in the completion
3. Flag if additional information is needed
4. Suggested improvements or alternatives

Respond with JSON containing completedFields, suggestions, and missingInfo arrays.
  `

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert grant application consultant. Complete form fields accurately and provide helpful suggestions. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  })

  return safeParseResponse(response.choices[0].message.content)
}

async function createCompletionPlan(formRequirements: any, context: any) {
  const prompt = `
Create a strategic completion plan for this grant application based on the requirements and available information.

FORM REQUIREMENTS:
${JSON.stringify(formRequirements, null, 2)}

CONTEXT:
${JSON.stringify(context, null, 2)}

Create a comprehensive completion plan with:
1. PHASES: Logical steps to complete the application
2. PRIORITIES: High/medium/low priority items
3. TIMELINE: Estimated time for each phase
4. RESOURCES: What information, documents, or help is needed
5. DEPENDENCIES: What must be completed before other tasks
6. RISKS: Potential challenges and mitigation strategies

Format as JSON with detailed phases array and overall strategy.
  `

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a strategic grant application consultant. Create actionable completion plans that maximize success probability. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.2,
    response_format: { type: 'json_object' }
  })

  return safeParseResponse(response.choices[0].message.content)
}

async function generateNarrativeContent(formFields: any, userProfile: any, projectData: any) {
  const prompt = `
Generate compelling narrative content for grant application sections based on the user's profile and project.

FORM SECTIONS NEEDING NARRATIVES:
${JSON.stringify(formFields, null, 2)}

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

PROJECT DATA:
${JSON.stringify(projectData, null, 2)}

For each narrative section, provide:
1. CONTENT: Well-written, compelling text
2. KEY_POINTS: Main messages conveyed
3. WORD_COUNT: Approximate length
4. TONE: Professional, persuasive, technical, etc.
5. IMPROVEMENT_TIPS: How to strengthen the narrative

Focus on demonstrating impact, feasibility, and alignment with funder priorities.
  `

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert grant writer. Create compelling, professional narratives that clearly communicate value and impact. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.3,
    response_format: { type: 'json_object' }
  })

  return safeParseResponse(response.choices[0].message.content)
}

async function detectMissingInformation(formFields: any, userProfile: any, projectData: any) {
  const prompt = `
Analyze what information is missing for completing this grant application form.

REQUIRED FORM FIELDS:
${JSON.stringify(formFields, null, 2)}

AVAILABLE USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

AVAILABLE PROJECT DATA:
${JSON.stringify(projectData, null, 2)}

Identify:
1. MISSING_CRITICAL: Essential information that's completely absent
2. MISSING_RECOMMENDED: Information that would strengthen the application
3. INCOMPLETE_FIELDS: Partial information that needs expansion
4. QUESTIONS_TO_ASK: Specific questions to gather missing information
5. PRIORITY_ORDER: What to collect first for maximum impact

Organize by urgency and provide specific guidance on gathering each type of information.
  `

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a thorough grant application analyst. Identify exactly what information is needed for a complete, competitive application. Always respond with valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: MAX_TOKENS,
    temperature: 0.1,
    response_format: { type: 'json_object' }
  })

  return safeParseResponse(response.choices[0].message.content)
}