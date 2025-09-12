// app/api/ai/categorize/route.ts

import { NextResponse } from 'next/server'
import aiProviderService from '../../../../lib/aiProviderService'

export async function POST(request: Request) {
  try {
    const { type, prompt, project, userProfile, userProfiles, userProjects } = await request.json()

    let systemPrompt = ''
    let userPrompt = ''

    switch (type) {
      case 'research':
        systemPrompt = `You are an expert at analyzing research projects and matching them to NSF funding opportunities. 
        Return only valid JSON without any markdown formatting or explanations.`
        userPrompt = prompt
        break

      case 'health':
        systemPrompt = `You are an expert at analyzing health and medical projects and matching them to NIH funding opportunities. 
        Return only valid JSON without any markdown formatting or explanations.`
        userPrompt = prompt
        break

      case 'foundations':
        systemPrompt = `You are an expert at analyzing nonprofit projects and matching them to foundation funding opportunities. 
        Return only valid JSON without any markdown formatting or explanations.`
        userPrompt = prompt
        break

      case 'contracts':
        systemPrompt = `You are an expert at analyzing business projects and matching them to government contract opportunities. 
        Return only valid JSON without any markdown formatting or explanations.`
        userPrompt = prompt
        break

      case 'sync_strategy':
        systemPrompt = `You are an expert at analyzing user data to optimize grant sync strategies. 
        Return only valid JSON without any markdown formatting or explanations.`
        userPrompt = prompt
        break

      default:
        // Fall back to general project categorization
        systemPrompt = `You are an expert grant advisor. Analyze projects and return categorization data as JSON.`
        userPrompt = `Analyze this project: ${project?.name || 'Unknown'} for grant opportunities.`
    }

    // Use hybrid AI provider for categorization
    const response = await aiProviderService.generateCompletion(
      'categorization',
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      {
        temperature: 0.1,
        maxTokens: 1000,
        responseFormat: 'json_object'
      }
    )

    if (!response?.content) {
      // Return null if no response (APIs will fall back to rule-based logic)
      return NextResponse.json(null)
    }
    
    // Parse AI response
    const result = aiProviderService.safeParseJSON(response.content)
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('AI categorization error:', error)
    // Return null on error so APIs can fall back to rule-based logic
    return NextResponse.json(null)
  }
}