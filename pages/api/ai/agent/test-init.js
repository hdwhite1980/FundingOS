// API endpoint to test unified agent initialization
import { UnifiedFundingAgent } from '../../../../lib/ai-agent/UnifiedAgent.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    console.log('🧪 Testing unified agent initialization for userId:', userId)

    // Create a new agent instance
    const agent = new UnifiedFundingAgent(userId)
    
    // Try to initialize
    const result = await agent.initialize()
    
    console.log('✅ Agent initialization test completed')

    res.status(200).json({
      success: true,
      result,
      message: 'Agent initialized successfully',
      goals: agent.activeGoals?.length || 0,
      strategy: agent.currentStrategy?.summary || 'No strategy set'
    })

  } catch (error) {
    console.error('❌ Agent initialization test failed:', error)
    
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}