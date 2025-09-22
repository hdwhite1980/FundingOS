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
    console.log(`UFA intelligence API: Processing request for tenantId=${tenantId}`)
    const dashboardData = await getIntelligenceDashboardData(tenantId)
    
    if (dashboardData.error) {
      console.error(`UFA intelligence API: Service returned error:`, dashboardData.error)
      return res.status(500).json({ error: dashboardData.error })
    }

    console.log(`UFA intelligence API: Returning data with ${Object.keys(dashboardData).length} keys`)
    return res.status(200).json(dashboardData)
  } catch (error) {
    console.error('UFA intelligence API: Unhandled error:', {
      message: error.message,
      stack: error.stack,
      tenantId,
      timestamp: new Date().toISOString()
    })
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
