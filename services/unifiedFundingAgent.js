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

  if (!supabase) return { ok: false, message: 'dry-run' }

  const now = new Date().toISOString()
  
  try {
    // Upsert metric and increment usage_count atomically
    const { data, error } = await supabase.rpc('ufa_upsert_metric', {
      p_tenant_id: tenantId,
      p_metric_key: 'last_run',
      p_value: now
    }).catch(e => ({ error: e }))

    if (error) {
      console.error('UFA: metric upsert failed', error)
      return { ok: false, error }
    }

    // Record an event for this analysis run
    await supabase.from('ufa_events').insert([{ 
      tenant_id: tenantId, 
      event_type: 'analysis_run', 
      payload: { run_at: now } 
    }]).catch(e => console.error('UFA: event insert failed', e))

    // Create/update strategic goals and tasks based on analysis
    await createStrategicGoalsAndTasks(tenantId)

    return { ok: true, data }
  } catch (err) {
    console.error('UFA: analysis failed', err)
    return { ok: false, error: err.message }
  }
}

async function createStrategicGoalsAndTasks(tenantId) {
  if (!supabase) return

  try {
    // Sample strategic goals based on funding analysis
    const goals = [
      {
        tenant_id: tenantId,
        title: 'Increase Grant Application Success Rate',
        description: 'Improve match accuracy and application quality to achieve 35% success rate',
        progress: Math.floor(Math.random() * 100)
      },
      {
        tenant_id: tenantId,
        title: 'Diversify Funding Portfolio',
        description: 'Secure funding from at least 5 different agencies/foundations this quarter',
        progress: Math.floor(Math.random() * 100)
      },
      {
        tenant_id: tenantId,
        title: 'Optimize Application Timeline',
        description: 'Reduce average application preparation time by 30%',
        progress: Math.floor(Math.random() * 100)
      }
    ]

    // Upsert goals (update if exists, insert if new)
    for (const goal of goals) {
      await supabase.from('ufa_goals').upsert([goal], { 
        onConflict: ['tenant_id', 'title'],
        ignoreDuplicates: false 
      })
    }

    // Sample strategic tasks/decisions
    const tasks = [
      {
        tenant_id: tenantId,
        title: 'Review STEM Education Grant Opportunity',
        summary: 'High-match federal grant deadline in 10 days. Requires immediate action.',
        status: 'urgent',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        tenant_id: tenantId,
        title: 'Update Organizational Capacity Statement',
        summary: 'Current capacity docs are 6 months old. Update needed for upcoming applications.',
        status: 'pending',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        tenant_id: tenantId,
        title: 'Establish Partnership with Local University',
        summary: 'Strategic partnership could strengthen 3 pending applications.',
        status: 'open'
      }
    ]

    // Insert tasks (allow duplicates for now)
    await supabase.from('ufa_tasks').insert(tasks)

    // Record additional metrics
    await supabase.rpc('ufa_upsert_metric', {
      p_tenant_id: tenantId,
      p_metric_key: 'active_goals',
      p_value: goals.length.toString()
    })

    await supabase.rpc('ufa_upsert_metric', {
      p_tenant_id: tenantId,
      p_metric_key: 'pending_tasks',
      p_value: tasks.length.toString()
    })

  } catch (err) {
    console.error('UFA: failed to create goals/tasks', err)
  }
}

async function enqueueNotification(tenantId, payload) {
  if (!supabase) return { ok: false, message: 'dry-run' }
  const { data, error } = await supabase.from('ufa_notifications').insert([{ tenant_id: tenantId, payload, status: 'pending' }])
  if (error) return { ok: false, error }
  return { ok: true, data }
}

module.exports = { runAnalysisForTenant, enqueueNotification }
