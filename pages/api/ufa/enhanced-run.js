// pages/api/ufa/enhanced-run.js
// Trigger the enhanced intelligence analysis and queue notifications

const { runExpertFundingAnalysisForTenant, processNotificationQueue } = require('../../../services/enhancedUnifiedFundingAgent')

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tenantId = req.method === 'GET'
    ? (req.query?.tenantId || req.query?.userId)
    : ((req.body || {}).tenantId || (req.body || {}).userId || req.query?.tenantId || req.query?.userId)

  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId required' })
  }

  try {
    const result = await runExpertFundingAnalysisForTenant(tenantId)
    // process notifications synchronously for now
    await processNotificationQueue()
    return res.status(200).json({ success: true, tenantId, result, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Enhanced run error:', error)
    return res.status(500).json({ error: 'internal', message: error?.message })
  }
}
