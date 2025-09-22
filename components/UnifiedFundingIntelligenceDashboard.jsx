import React, { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, Bell, Brain, CheckCircle2, Clock, Database, Globe2, Mail, Map, Play, RefreshCw, Settings, Shield, TrendingUp, Zap } from 'lucide-react'

export default function UnifiedFundingIntelligenceDashboard({ tenantId = 'default-tenant' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ufa/intelligence?tenantId=${tenantId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load intelligence')
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function triggerAnalysis() {
    try {
      await fetch('/api/ufa/enhanced-run', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      })
      await fetchData()
    } catch (e) {
      console.error('Failed to trigger analysis', e)
    }
  }

  if (loading && !data) return <div className="p-6">Loading intelligence...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!data) return <div className="p-6">No intelligence available</div>

  const { aiStatus, goals, tasks, metrics, events, notifications, strategicOverview } = data

  return (
    <div className="p-6 space-y-6">
      {/* AI Status & Controls */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold">UFA Status</h3>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${aiStatus?.state === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {aiStatus?.state || 'idle'}
            </span>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            <div>Confidence: <span className="font-medium">{aiStatus?.confidence?.toFixed ? aiStatus.confidence.toFixed(1) : aiStatus.confidence}%</span></div>
            <div>Currently analyzing: <span className="font-medium">{aiStatus?.processing}</span></div>
            <div>Next analysis: <span className="font-medium">{aiStatus?.nextAnalysis}</span></div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={triggerAnalysis} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
              <Play className="h-4 w-4" /> Run Analysis
            </button>
            <button onClick={fetchData} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded border hover:bg-gray-50">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold">Strategic Overview</h3>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Opportunities" value={strategicOverview?.totalOpportunities} />
            <Metric label="High-Priority" value={strategicOverview?.highPriorityMatches} />
            <Metric label="Applications" value={strategicOverview?.applicationsPending} />
            <Metric label="Success Rate" value={`${strategicOverview?.successRate || 0}%`} />
            <Metric label="Portfolio" value={`$${(strategicOverview?.portfolioValue || 0).toLocaleString()}`} />
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-white">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold">Automations</h3>
          </div>
          <ul className="mt-3 text-sm space-y-2">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-700"><Mail className="h-4 w-4" /> Strategic updates</span>
              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">enabled</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-700"><Bell className="h-4 w-4" /> Urgent deadline alerts</span>
              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">enabled</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-gray-700"><Shield className="h-4 w-4" /> RLS security</span>
              <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">active</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Goals & Decisions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Active Goals" icon={<CheckCircle2 className="h-5 w-5 text-blue-600" />}> 
          <div className="space-y-2">
            {(goals || []).map(goal => (
              <div key={goal.id} className="p-3 border rounded hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{goal.title}</div>
                  <span className={`text-xs px-2 py-0.5 rounded ${statusColor(goal.status)}`}>{goal.status}</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">{goal.description}</div>
                <div className="mt-2 h-2 bg-gray-100 rounded">
                  <div className="h-2 bg-blue-600 rounded" style={{ width: `${goal.progress || 0}%` }} />
                </div>
                <div className="mt-1 text-xs text-gray-500">Due {new Date(goal.deadline).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pending Decisions" icon={<Clock className="h-5 w-5 text-rose-600" />}> 
          <div className="space-y-2">
            {(tasks || []).map(task => (
              <div key={task.id} className="p-3 border rounded hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{task.title || task.summary}</div>
                  <span className={`text-xs px-2 py-0.5 rounded ${task.status === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{task.status}</span>
                </div>
                <div className="mt-1 text-sm text-gray-600">{task.summary}</div>
                {task.due_date && (
                  <div className="mt-1 text-xs text-gray-500">Due {new Date(task.due_date).toLocaleDateString()}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Intelligence & Events */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Key Metrics" icon={<Activity className="h-5 w-5 text-emerald-600" />}> 
          <div className="grid grid-cols-2 gap-2">
            {(metrics || []).slice(0,8).map(m => (
              <div key={m.id} className="p-2 border rounded text-sm">
                <div className="text-gray-500">{labelize(m.metric_key)}</div>
                <div className="font-medium">{m.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Events" icon={<Database className="h-5 w-5 text-indigo-600" />}> 
          <div className="space-y-2">
            {(events || []).slice(0,8).map(e => (
              <div key={e.id} className="p-2 border rounded text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{labelize(e.event_type)}</div>
                  <div className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</div>
                </div>
                {e.payload && <div className="text-gray-600 mt-1">{summarizePayload(e.payload)}</div>}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Notifications" icon={<Bell className="h-5 w-5 text-amber-600" />}> 
          <div className="space-y-2">
            {(notifications || []).slice(0,6).map(n => (
              <div key={n.id} className="p-2 border rounded text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{labelize(n.payload?.type || 'notification')}</div>
                  <span className={`text-xs px-2 py-0.5 rounded ${n.status === 'sent' ? 'bg-green-100 text-green-700' : n.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{n.status}</span>
                </div>
                <div className="text-gray-600 mt-1">{n.payload?.subject || n.payload?.type}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Context & Strategy */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="National Context" icon={<Globe2 className="h-5 w-5 text-sky-600" />}> 
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> STEM education funding up 23%</li>
            <li className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /> Climate education grants surging</li>
            <li className="flex items-center gap-2"><Map className="h-4 w-4 text-indigo-600" /> Regional partnerships improving competitiveness</li>
          </ul>
        </Card>

        <Card title="Recommended Actions" icon={<ArrowUpRight className="h-5 w-5 text-rose-600" />}> 
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600" /> Prioritize NSF Education Innovation Hub</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600" /> Initiate corporate partnership outreach</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600" /> Accelerate grant writing cycle</li>
          </ul>
        </Card>
      </section>
    </div>
  )
}

function Card({ title, icon, children }) {
  return (
    <div className="p-4 rounded-lg border bg-white">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="p-2 rounded border bg-gray-50">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function labelize(str = '') {
  return String(str).replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function statusColor(status) {
  switch (status) {
    case 'on-track': return 'bg-green-100 text-green-700'
    case 'needs-attention': return 'bg-amber-100 text-amber-700'
    case 'at-risk': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function summarizePayload(payload) {
  try {
    const p = typeof payload === 'string' ? JSON.parse(payload) : payload
    if (p?.opportunities_found) return `${p.opportunities_found} opportunities; confidence ${p.confidence_score?.toFixed?.(1) ?? p.confidence_score}`
    if (p?.emails_queued !== undefined) return `${p.emails_queued} emails queued; ${p.insights_generated} insights` 
    return Object.keys(p || {}).slice(0,3).map(k => `${k}: ${p[k]}`).join(', ')
  } catch {
    return ''
  }
}
