// pages/api/ufa/status.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export default async function handler(req, res) {
  const tenantId = req.query.tenantId || req.body?.tenantId
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  if (!supabase) return res.status(500).json({ error: 'supabase not configured' })

  try {
    // Fetch goals
    const { data: goals } = await supabase
      .from('ufa_goals')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch tasks  
    const { data: tasks } = await supabase
      .from('ufa_tasks')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch metrics
    const { data: metrics } = await supabase
      .from('ufa_metrics')
      .select('metric_key, value, usage_count, updated_at')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false })
      .limit(20)

    // Fetch recent events
    const { data: events } = await supabase
      .from('ufa_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(15)

    // Fetch pending notifications
    const { data: notifications } = await supabase
      .from('ufa_notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    // Determine overall status
    const hasRecentActivity = events?.length > 0 && 
      new Date(events[0].created_at) > new Date(Date.now() - 5 * 60 * 1000) // within 5 minutes
    
    const status = hasRecentActivity ? 'active' : 'idle'

    const payload = {
      status,
      goals: goals || [],
      tasks: tasks || [],
      metrics: (metrics || []).map(m => ({ key: m.metric_key, value: m.value, usage_count: m.usage_count })),
      events: events || [],
      notifications: notifications || []
    }

    return res.status(200).json(payload)
  } catch (error) {
    console.error('UFA status error', error)
    return res.status(500).json({ error: 'internal' })
  }
}
