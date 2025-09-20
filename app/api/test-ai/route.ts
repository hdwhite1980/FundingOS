import { NextRequest, NextResponse } from 'next/server'
import aiProviderService from '../../../lib/aiProviderService'

export async function GET(request: NextRequest) {
  try {
    // Test the AI provider service
    console.log('Testing AI provider connections...')
    
    // Check if API key is set
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-placeholder'
    const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder'
    
    if (!hasOpenAIKey && !hasAnthropicKey) {
      return NextResponse.json({
        error: 'No valid API keys found',
        details: 'Both OPENAI_API_KEY and ANTHROPIC_API_KEY are missing or using placeholder values'
      }, { status: 400 })
    }
    
    // Test connection
    const connectionResults = await aiProviderService.testConnections()
    
    // Try a simple completion
    let testCompletion: any = null
    try {
      const result = await aiProviderService.generateCompletion('conversation', [
        { role: 'system', content: 'You are a helpful assistant. Respond with exactly "Connection successful!"' },
        { role: 'user', content: 'Test connection' }
      ], { maxTokens: 20, temperature: 0 })
      testCompletion = result
    } catch (error: any) {
      console.error('Test completion failed:', error.message)
      testCompletion = { error: error.message }
    }
    
    return NextResponse.json({
      status: 'AI Provider Test Results',
      apiKeys: {
        openai: hasOpenAIKey ? 'configured' : 'missing/placeholder',
        anthropic: hasAnthropicKey ? 'configured' : 'missing/placeholder'
      },
      connectionResults,
      testCompletion,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('AI test error:', error)
    return NextResponse.json({ 
      error: 'AI test failed', 
      details: error.message 
    }, { status: 500 })
  }
}