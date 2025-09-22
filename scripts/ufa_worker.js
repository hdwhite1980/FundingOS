// scripts/ufa_worker.js
// Simple UFA worker: iterate tenants, run analysis, record events, enqueue notifications

const { createClient } = require('@supabase/supabase-js')
const { runAnalysisForTenant, enqueueNotification } = require('../services/unifiedFundingAgent')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function listTenants() {
  // Adjust to your tenant source; here we assume `profiles` has a `tenant_id` or `org_id`
  const { data, error } = await supabase.from('profiles').select('id, tenant_id').limit(1000)
  if (error) throw error
  return data.map(r => r.tenant_id || r.id)
}

async function main() {
  try {
    const tenants = await listTenants()
    console.log('Found tenants:', tenants.length)

    for (const tenantId of tenants) {
      try {
        console.log('Running analysis for', tenantId)
        const result = await runAnalysisForTenant(tenantId)
        if (result.ok) {
          // enqueue a summary notification to the tenant admins (payload can be enriched)
          await enqueueNotification(tenantId, { type: 'analysis_summary', summary: 'Analysis completed', details: result.data })
        }
      } catch (err) {
        console.error('Error running analysis for', tenantId, err)
      }
    }

    console.log('UFA worker finished')
  } catch (err) {
    console.error('UFA worker error', err)
    process.exit(2)
  }
}

if (require.main === module) main()
