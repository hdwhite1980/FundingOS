// pages/api/ai/unified-agent/admin/start-system.js
// Production startup endpoint for the unified AI agent system

import { unifiedAgentManager } from '../../../../lib/ai-agent/UnifiedManager'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Optional: Add admin authentication here
  const adminKey = req.headers['x-admin-key']
  if (process.env.ADMIN_API_KEY && adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    console.log('🚀 Starting Unified AI Agent System...')
    
    // Check if system is already running
    const currentStatus = await unifiedAgentManager.getSystemStatus()
    
    if (currentStatus.isRunning) {
      return res.json({
        success: true,
        message: 'Unified AI Agent System is already running',
        status: currentStatus,
        alreadyRunning: true
      })
    }
    
    // Start the unified agent manager
    await unifiedAgentManager.startAllAgents()
    
    // Get updated status
    const status = await unifiedAgentManager.getSystemStatus()
    
    console.log(`✅ Unified AI Agent System started with ${status.totalAgents} agents`)
    
    res.json({ 
      success: true, 
      message: 'Unified AI Agent System started successfully',
      status: status,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error starting unified agent system:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

// pages/api/ai/unified-agent/admin/stop-system.js
export async function stopSystemHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  // Optional: Add admin authentication here
  const adminKey = req.headers['x-admin-key']
  if (process.env.ADMIN_API_KEY && adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    console.log('🛑 Stopping Unified AI Agent System...')
    
    // Graceful shutdown
    await unifiedAgentManager.gracefulShutdown()
    
    res.json({ 
      success: true, 
      message: 'Unified AI Agent System stopped successfully',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error stopping unified agent system:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}

// pages/api/ai/unified-agent/admin/system-status.js
export async function systemStatusHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const status = await unifiedAgentManager.getSystemStatus()
    
    // Get additional system health metrics
    const healthMetrics = {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    }
    
    res.json({
      success: true,
      systemStatus: status,
      healthMetrics: healthMetrics,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error getting system status:', error)
    res.status(500).json({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}