// pages/api/ufa/trigger.js
import { runAnalysisForTenant } from '../../../services/unifiedFundingAgent'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantId } = req.body
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  try {
    const result = await runAnalysisForTenant(tenantId)
    return res.status(200).json(result)
  } catch (error) {
    console.error('UFA trigger error', error)
    return res.status(500).json({ error: 'internal' })
  }
}
