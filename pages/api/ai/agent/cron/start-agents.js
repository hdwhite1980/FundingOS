import { agentManager } from '../../../../lib/ai-agent/manager.js'

export default async function handler(req, res) {
  // Verify this is a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await agentManager.startAllAgents()
    res.json({ success: true, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Cron error:', error)
    res.status(500).json({ error: error.message })
  }
}