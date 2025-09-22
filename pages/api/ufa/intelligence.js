// pages/api/ufa/intelligence.js
// Main dashboard data endpoint for UFA Intelligence Dashboard

const { getIntelligenceDashboardData } = require('../../../services/enhancedUnifiedFundingAgent')

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tenantId = req.query.tenantId
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId required' })
  }

  try {
    const dashboardData = await getIntelligenceDashboardData(tenantId)
    
    if (dashboardData.error) {
      return res.status(500).json({ error: dashboardData.error })
    }

    return res.status(200).json(dashboardData)
  } catch (error) {
    console.error('UFA intelligence API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
