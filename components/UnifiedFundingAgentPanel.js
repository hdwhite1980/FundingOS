'use client'
import React, { useEffect, useState } from 'react'

export default function UnifiedFundingAgentPanel({ tenantId }) {
  const [status, setStatus] = useState(null)
  const [goals, setGoals] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tenantId) return
    fetchStatus()
  }, [tenantId])

  async function fetchStatus() {
    setLoading(true)
    try {
      const res = await fetch(`/api/ufa/status?tenantId=${tenantId}`)
      if (res.ok) {
        const j = await res.json()
        setStatus(j.status)
        setGoals(j.goals || [])
        setTasks(j.tasks || [])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Unified Funding Agent</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchStatus} className="px-2 py-1 bg-emerald-600 text-white rounded">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1 p-3 border rounded">
          <div className="text-sm text-gray-500">Status</div>
          <div className="text-xl font-bold">{status || 'idle'}</div>
        </div>
        <div className="col-span-2 p-3 border rounded">
          <div className="text-sm text-gray-500">Goals</div>
          {goals.length === 0 ? <div className="text-xs text-gray-600">No active goals</div> : (
            <ul className="mt-2 space-y-2">
              {goals.map(g => (
                <li key={g.id} className="p-2 bg-gray-50 rounded">{g.title} <div className="text-xs text-gray-500">{g.progress || 0}%</div></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm text-gray-500 mb-2">Pending Decisions / Tasks</div>
        {tasks.length === 0 ? <div className="text-xs text-gray-600">No pending items</div> : (
          <ul className="space-y-2">
            {tasks.map(t => (
              <li key={t.id} className="p-2 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-gray-500">{t.summary}</div>
                </div>
                <div>
                  <button className="px-2 py-1 bg-emerald-600 text-white rounded">Take Action</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
