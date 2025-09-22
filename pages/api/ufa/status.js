// pages/api/ufa/status.js
import { runAnalysisForTenant } from '../../../services/unifiedFundingAgent'

export default async function handler(req, res) {
  const tenantId = req.query.tenantId || req.body?.tenantId
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  try {
    // For now run analysis on demand and return a lightweight status
    const result = await runAnalysisForTenant(tenantId)
    // Placeholder structure
    const payload = {
      status: result.ok ? 'ok' : 'dry-run',
      goals: [
        { id: 'g1', title: 'Increase grant submissions', progress: 42 },
        { id: 'g2', title: 'Improve match rate', progress: 18 }
      ],
      tasks: [
        { id: 't1', title: 'Approve budget narrative', summary: 'Finalize the organizational budget narrative for Application X' }
      ]
    }

    return res.status(200).json(payload)
  } catch (error) {
    console.error('UFA status error', error)
    return res.status(500).json({ error: 'internal' })
  }
}
