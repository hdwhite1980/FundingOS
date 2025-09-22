'use client'
import React, { useEffect, useState } from 'react'

export default function UnifiedFundingAgentPanel({ tenantId }) {
  const [status, setStatus] = useState(null)
  const [goals, setGoals] = useState([])
  const [tasks, setTasks] = useState([])
  const [metrics, setMetrics] = useState([])
  const [events, setEvents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tenantId) return
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [tenantId])

  async function fetchStatus() {
    setLoading(true)
    try {
      const res = await fetch(`/api/ufa/status?tenantId=${tenantId}`)
      if (res.ok) {
        const data = await res.json()
        setStatus(data.status)
        setGoals(data.goals || [])
        setTasks(data.tasks || [])
        setMetrics(data.metrics || [])
        setEvents(data.events || [])
        setNotifications(data.notifications || [])
      }
    } catch (err) {
      console.error('UFA status fetch failed', err)
    } finally {
      setLoading(false)
    }
  }

  const StatusIndicator = ({ status }) => {
    const color = status === 'active' ? 'bg-green-500' : status === 'analyzing' ? 'bg-yellow-500' : 'bg-gray-400'
    return <div className={`w-3 h-3 rounded-full ${color} animate-pulse`}></div>
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Unified Funding Agent</h2>
          <StatusIndicator status={status} />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-slate-500">Last updated: {new Date().toLocaleTimeString()}</div>
          <button 
            onClick={fetchStatus} 
            disabled={loading}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm disabled:opacity-50"
          >
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {metrics.map(metric => (
          <div key={metric.key} className="bg-white p-4 rounded-lg shadow border-l-4 border-emerald-500">
            <div className="text-sm font-medium text-slate-600 uppercase tracking-wide">{metric.key.replace('_', ' ')}</div>
            <div className="text-2xl font-bold text-slate-800">{metric.value}</div>
            <div className="text-xs text-slate-500">Used {metric.usage_count || 0} times</div>
          </div>
        ))}
      </div>

      {/* Goals and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-5 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Active Goals
          </h3>
          {goals.length === 0 ? (
            <div className="text-slate-500 text-sm">No active goals configured</div>
          ) : (
            <div className="space-y-3">
              {goals.map(goal => (
                <div key={goal.id} className="border-l-3 border-blue-400 pl-4">
                  <div className="font-medium text-slate-800">{goal.title}</div>
                  <div className="text-sm text-slate-600">{goal.description}</div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Progress</span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            Pending Decisions
          </h3>
          {tasks.length === 0 ? (
            <div className="text-slate-500 text-sm">No pending decisions</div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <div key={task.id} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{task.title}</div>
                      <div className="text-sm text-slate-600 mt-1">{task.summary}</div>
                      {task.due_date && (
                        <div className="text-xs text-amber-600 mt-2">Due: {new Date(task.due_date).toLocaleDateString()}</div>
                      )}
                    </div>
                    <div className="ml-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'urgent' ? 'bg-red-100 text-red-800' :
                        task.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Stream and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Recent Activity
          </h3>
          {events.length === 0 ? (
            <div className="text-slate-500 text-sm">No recent activity</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {events.map(event => (
                <div key={event.id} className="flex items-center gap-3 text-sm">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1">
                    <span className="font-medium">{event.event_type.replace('_', ' ')}</span>
                    <span className="text-slate-500 ml-2">{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            Strategic Insights
          </h3>
          {notifications.length === 0 ? (
            <div className="text-slate-500 text-sm">No new insights</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notifications.map(notif => (
                <div key={notif.id} className="p-3 bg-purple-50 border border-purple-200 rounded text-sm">
                  <div className="font-medium text-purple-800">
                    {notif.payload?.type?.replace('_', ' ') || 'System Update'}
                  </div>
                  <div className="text-purple-700 mt-1">
                    {notif.payload?.summary || 'Analysis completed'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
