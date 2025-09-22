// pages/api/ufa/enhanced-run.js
// Trigger the enhanced intelligence analysis and queue notifications

const { runEnhancedAnalysisForTenant, processNotificationQueue } = require('../../../services/enhancedUnifiedFundingAgent')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantId } = req.body || {}
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  try {
    const result = await runEnhancedAnalysisForTenant(tenantId)
    // process notifications synchronously for now
    await processNotificationQueue()
    return res.status(200).json(result)
  } catch (error) {
    console.error('Enhanced run error:', error)
    return res.status(500).json({ error: 'internal' })
  }
}
