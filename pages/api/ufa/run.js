// pages/api/ufa/run.js
// Vercel-friendly endpoint to trigger UFA runs. Can be called by Vercel cron.

import { runAnalysisForTenant, enqueueNotification } from '../../../services/unifiedFundingAgent'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export default async function handler(req, res) {
  // Support GET (for cron) and POST (manual) triggers
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const tenantId = req.query.tenantId || req.body?.tenantId
  const limit = parseInt(req.query.limit || req.body?.limit || '1000', 10)

  try {
    if (tenantId) {
      const r = await runAnalysisForTenant(tenantId)
      if (r.ok) await enqueueNotification(tenantId, { type: 'analysis_summary', summary: 'Scheduled analysis completed' })
      return res.status(200).json({ tenantId, result: r })
    }

    if (!supabase) return res.status(500).json({ error: 'supabase not configured' })

    const { data, error } = await supabase.from('profiles').select('id, tenant_id').limit(limit)
    if (error) return res.status(500).json({ error: 'failed to list tenants' })

    const tenants = data.map(r => r.tenant_id || r.id)
    const results = []
    for (const t of tenants) {
      const r = await runAnalysisForTenant(t)
      if (r.ok) await enqueueNotification(t, { type: 'analysis_summary', summary: 'Scheduled analysis completed' })
      results.push({ tenant: t, ok: r.ok })
    }

    return res.status(200).json({ processed: results.length, results })
  } catch (err) {
    console.error('UFA run error', err)
    return res.status(500).json({ error: 'internal' })
  }
}
