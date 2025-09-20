/**
 * Form AI Assistant API - Interactive help for form completion
 * /api/form/ai-assistant
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import aiProviderService from '../../../../lib/aiProviderService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { 
      action, 
      sessionId,
      userId,
      projectId,
      formAnalysisId,
      message,
      fieldContext,
      formData,
      userProfile
    } = await request.json()

    switch (action) {
      case 'create_session':
        return await createAISession(userId, projectId, formAnalysisId, formData)
      
      case 'send_message':
        return await sendMessage(sessionId, message, fieldContext, formData, userProfile)
      
      case 'generate_field_content':
        return await generateFieldContent(sessionId, fieldContext, formData, userProfile)
      
      case 'get_session':
        return await getSession(sessionId)
      
      case 'get_messages':
        return await getMessages(sessionId)
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Form AI Assistant API error:', error)
    return NextResponse.json(
      { success: false, error: 'AI assistant operation failed' },
      { status: 500 }
    )
  }
}

async function createAISession(userId: string, projectId: string, formAnalysisId: string, formData: any) {
  const { data: session, error } = await supabase
    .from('form_ai_sessions')
    .insert([{
      user_id: userId,
      project_id: projectId,
      form_analysis_id: formAnalysisId,
      session_title: `Form Assistant - ${new Date().toLocaleDateString()}`,
      form_context: formData || {}
    }])
    .select()
    .single()

  if (error) {
    throw new Error('Failed to create AI session')
  }

  // Send welcome message
  await supabase
    .from('form_ai_messages')
    .insert([{
      session_id: session.id,
      role: 'assistant',
      content: "Hello! I'm your AI form completion assistant. I can help you:\n\n• **Understand field requirements** - Ask me what any field means\n• **Generate content** - I can write text for narrative fields\n• **Provide suggestions** - Get help with complex questions\n• **Review your answers** - Check if your responses look good\n\nWhat field would you like help with?",
      ai_provider: 'system',
      ai_model: 'assistant'
    }])

  return NextResponse.json({
    success: true,
    data: {
      sessionId: session.id,
      title: session.session_title,
      created: session.created_at
    }
  })
}

async function sendMessage(sessionId: string, message: string, fieldContext?: string, formData?: any, userProfile?: any) {
  // Store user message
  const { error: userMsgError } = await supabase
    .from('form_ai_messages')
    .insert([{
      session_id: sessionId,
      role: 'user',
      content: message,
      field_context: fieldContext
    }])

  if (userMsgError) {
    throw new Error('Failed to store user message')
  }

  // Generate AI response
  const aiResponse = await generateAIResponse(sessionId, message, fieldContext, formData, userProfile)
  
  // Store AI response
  const { data: aiMessage, error: aiMsgError } = await supabase
    .from('form_ai_messages')
    .insert([{
      session_id: sessionId,
      role: 'assistant',
      content: aiResponse.content,
      field_context: fieldContext,
      ai_provider: aiResponse.provider,
      ai_model: aiResponse.model,
      response_time: aiResponse.responseTime,
      token_usage: aiResponse.tokenUsage,
      generated_text: aiResponse.generatedText,
      field_suggestions: aiResponse.fieldSuggestions
    }])
    .select()
    .single()

  if (aiMsgError) {
    throw new Error('Failed to store AI response')
  }

  // Update session stats
  await supabase.rpc('sql', {
    query: `
      UPDATE form_ai_sessions 
      SET message_count = message_count + 2,
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `,
    params: [sessionId]
  })

  return NextResponse.json({
    success: true,
    data: {
      messageId: aiMessage.id,
      content: aiResponse.content,
      generatedText: aiResponse.generatedText,
      fieldSuggestions: aiResponse.fieldSuggestions,
      provider: aiResponse.provider
    }
  })
}

async function generateFieldContent(sessionId: string, fieldContext: string, formData: any, userProfile: any) {
  if (!fieldContext) {
    return NextResponse.json(
      { success: false, error: 'Field context required' },
      { status: 400 }
    )
  }

  // Generate content specifically for a field
  const prompt = buildFieldGenerationPrompt(fieldContext, formData, userProfile)
  
  const startTime = Date.now()
  const aiResponse = await aiProviderService.generateCompletion(
    'form-field-generation',
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
      temperature: 0.7,
      max_tokens: 1000
    }
  )
  const responseTime = Date.now() - startTime

  const generatedContent = aiResponse?.content || ''
  
  // Store the generation request and result
  const { data: message } = await supabase
    .from('form_ai_messages')
    .insert([{
      session_id: sessionId,
      role: 'assistant',
      content: `Generated content for "${fieldContext}":\n\n${generatedContent}`,
      field_context: fieldContext,
      ai_provider: 'openai',
      ai_model: 'gpt-4o-mini',
      response_time: responseTime,
      generated_text: generatedContent
    }])
    .select()
    .single()

  return NextResponse.json({
    success: true,
    data: {
      messageId: message?.id,
      fieldContext,
      generatedText: generatedContent,
      content: `Generated content for "${fieldContext}":\n\n${generatedContent}`
    }
  })
}

async function generateAIResponse(sessionId: string, userMessage: string, fieldContext?: string, formData?: any, userProfile?: any) {
  // Get recent conversation history
  const { data: recentMessages } = await supabase
    .from('form_ai_messages')
    .select('role, content, field_context')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10)

  const conversationHistory = recentMessages?.reverse() || []

  const prompt = buildAssistantPrompt(userMessage, fieldContext, formData, userProfile, conversationHistory)
  
  const startTime = Date.now()
  const aiResponse = await aiProviderService.generateCompletion(
    'form-assistant',
    [
      {
        role: 'system',
        content: prompt.system
      },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content: userMessage
      }
    ],
    {
      temperature: 0.4,
      max_tokens: 800
    }
  )
  const responseTime = Date.now() - startTime

  return {
    content: aiResponse?.content || 'I apologize, but I encountered an issue generating a response. Please try again.',
    provider: 'openai',
    model: 'gpt-4o-mini',
    responseTime,
    tokenUsage: { prompt_tokens: 0, completion_tokens: 0 },
    generatedText: extractGeneratedText(aiResponse?.content || ''),
    fieldSuggestions: extractFieldSuggestions(aiResponse?.content || '', fieldContext)
  }
}

async function getSession(sessionId: string) {
  const { data: session, error } = await supabase
    .from('form_ai_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Session not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: session
  })
}

async function getMessages(sessionId: string) {
  const { data: messages, error } = await supabase
    .from('form_ai_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve messages' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: messages || []
  })
}

function buildAssistantPrompt(userMessage: string, fieldContext?: string, formData?: any, userProfile?: any, history?: any[]) {
  return {
    system: `You are an expert form completion assistant helping users fill out grant applications and government forms. You have deep knowledge of:

- **Grant application requirements and best practices**
- **Government form terminology and compliance**  
- **Professional writing for applications**
- **Field-specific requirements and formats**

Your role is to:
1. **Explain form fields** clearly and simply
2. **Generate high-quality content** for narrative fields
3. **Provide specific suggestions** based on user context
4. **Help with compliance and requirements**

Current context:
- Field in focus: ${fieldContext || 'General question'}
- User type: ${userProfile?.user_type || 'Unknown'}
- Organization: ${userProfile?.organization || 'Unknown'}

Guidelines:
- Be helpful, professional, and specific
- Provide actionable advice and concrete examples
- If generating content, make it ready-to-use
- Ask clarifying questions when needed
- Reference relevant regulations or requirements when applicable`,

    user: userMessage
  }
}

function buildFieldGenerationPrompt(fieldContext: string, formData: any, userProfile: any) {
  return {
    system: `You are an expert grant writer and form completion specialist. Generate high-quality, professional content for form fields that is:

1. **Compliant** with grant/government requirements
2. **Compelling** and persuasive where appropriate  
3. **Specific** and detailed rather than generic
4. **Professional** in tone and language
5. **Ready to use** without additional editing

Context available:
- Organization: ${userProfile?.organization || 'Unknown'}
- User type: ${userProfile?.user_type || 'Unknown'}  
- Project type: ${formData?.project_type || 'Unknown'}
- Field: ${fieldContext}

Generate content that directly addresses the field requirements and showcases expertise.`,

    user: `Generate professional content for the field: "${fieldContext}"

Consider the context and requirements for this specific field. Make the content compelling, specific, and compliance-ready.`
  }
}

function extractGeneratedText(content: string): string | null {
  // Extract generated text from AI response if it's providing content for a field
  const textMatch = content.match(/(?:Here's|Here is|Generated content)[\s\S]*?:\s*\n\n([\s\S]+?)(?:\n\n|$)/i)
  return textMatch ? textMatch[1].trim() : null
}

function extractFieldSuggestions(content: string, fieldContext?: string): any {
  // Extract field suggestions if the AI is providing multiple options
  const suggestions: any = {}
  
  if (fieldContext && content.includes('suggestion')) {
    // Simple extraction - can be enhanced
    suggestions[fieldContext] = content
  }
  
  return Object.keys(suggestions).length > 0 ? suggestions : null
}