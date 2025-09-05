// pages/api/admin/start-agents.js
import { agentManager } from '../../../lib/ai-agent/manager'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('🚀 Starting AI Agent Manager...')
    
    // Start the agent manager
    await agentManager.startAllAgents()
    
    const status = await agentManager.getManagerStatus()
    
    res.json({ 
      success: true, 
      message: 'AI Agent Manager started successfully',
      status: status
    })
  } catch (error) {
    console.error('Error starting agent manager:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
}