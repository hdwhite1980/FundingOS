// Test endpoint to debug agent initialization
import { TestUnifiedAgent } from '../../../../lib/ai-agent/TestAgent'

export default async function handler(req, res) {
  try {
    console.log('=== Testing Agent Initialization ===')
    
    const userId = req.body?.userId || req.query?.userId || '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
    console.log('Testing with user ID:', userId)
    
    // Test 1: Environment check
    console.log('Environment check...')
    const envCheck = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
    console.log('Environment variables:', envCheck)
    
    // Test 2: Create test agent
    console.log('Creating test agent...')
    const testAgent = new TestUnifiedAgent(userId)
    
    // Test 3: Initialize
    console.log('Initializing test agent...')
    const initResult = await testAgent.initialize()
    
    console.log('Test completed successfully!')
    
    res.json({
      success: true,
      tests: {
        environment: envCheck,
        agentCreation: 'success',
        initialization: initResult
      },
      message: 'All tests passed'
    })
    
  } catch (error) {
    console.error('Test failed:', error)
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      name: error.name
    })
  }
}