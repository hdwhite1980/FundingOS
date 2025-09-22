// services/unifiedFundingAgent.js
// Lightweight Unified Funding Agent (UFA) scaffold

const { createClient } = require('@supabase/supabase-js')
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('UFA: Supabase env vars not set - running in dry mode')
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

async function runAnalysisForTenant(tenantId) {
  // Placeholder: gather org data, projects, submissions, external signals
  // and compute goals/performance/pending decisions.
  console.log('UFA: Running analysis for tenant', tenantId)

  // Example: upsert a metric
  if (!supabase) return { ok: false, message: 'dry-run' }

  const now = new Date().toISOString()
  const { data, error } = await supabase.from('ufa_metrics').upsert([
    { tenant_id: tenantId, metric_key: 'last_run', value: now }
  ], { onConflict: ['tenant_id', 'metric_key'] })

  if (error) {
    console.error('UFA: metric upsert failed', error)
    return { ok: false, error }
  }

  return { ok: true, data }
}

async function enqueueNotification(tenantId, payload) {
  if (!supabase) return { ok: false, message: 'dry-run' }
  const { data, error } = await supabase.from('ufa_notifications').insert([{ tenant_id: tenantId, payload, status: 'pending' }])
  if (error) return { ok: false, error }
  return { ok: true, data }
}

module.exports = { runAnalysisForTenant, enqueueNotification }
