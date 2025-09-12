// pages/api/admin/start-agents.js
import { unifiedAgentManager } from '../../../../../lib/ai-agent/UnifiedManager'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('🚀 Starting Unified AI Agent Manager...')
    
    // Start the unified agent manager
    await unifiedAgentManager.startAllAgents()
    
    const status = await unifiedAgentManager.getSystemStatus()
    
    res.json({ 
      success: true, 
      message: 'Unified AI Agent Manager started successfully',
      status: status
    })
  } catch (error) {
    console.error('Error starting unified agent manager:', error)
    res.status(500).json({ 
      success: false,
      error: error.message 
    })
  }
}