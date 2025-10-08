'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  History,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  XCircle
} from 'lucide-react'
const cx = (...classes) => classes.filter(Boolean).join(' ')

const statusColors = {
  good: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  critical: 'bg-red-100 text-red-700 border border-red-200',
  pending: 'bg-slate-100 text-slate-600 border border-slate-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  uploaded: 'bg-blue-100 text-blue-700 border border-blue-200',
  verified: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
}

const priorityBadge = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700'
}

const formatDate = (value) => {
  if (!value) return 'No deadline'
  const d = new Date(value)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

const formatRelative = (value) => {
  if (!value) return null
  const target = new Date(value)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'due today'
  if (diffDays > 0) return `due in ${diffDays} day${diffDays === 1 ? '' : 's'}`
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`
}

export default function ComplianceDashboard({ userId, userProfile }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRunningCheck, setIsRunningCheck] = useState(false)
  const [trackingDraft, setTrackingDraft] = useState({
    title: '',
    compliance_type: '',
    deadline_date: '',
    priority: 'medium',
    description: ''
  })
  const [documentDraft, setDocumentDraft] = useState({
    document_name: '',
    document_type: '',
    expiration_date: '',
    is_required: true
  })

  useEffect(() => {
    if (userId) {
      fetchCompliance()
    }
  }, [userId])

  const fetchCompliance = async () => {
    try {
      if (!data) {
        setLoading(true)
      } else {
        setIsRefreshing(true)
      }
      const response = await fetch(`/api/compliance?userId=${userId}`)
      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Failed to load compliance data')
      }
      setData(json.data)
      setError(null)
    } catch (err) {
      console.error('Compliance fetch failed', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const sendAction = async (action, payload = {}) => {
    const response = await fetch('/api/compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, data: payload })
    })
    const json = await response.json()
    if (!response.ok) {
      throw new Error(json.error || 'Compliance action failed')
    }
    return json.data
  }

  const handleRunCheck = async () => {
    if (!userId) return
    setIsRunningCheck(true)
    try {
      await sendAction('run_compliance_check')
      await fetchCompliance()
    } catch (err) {
      console.error('Run compliance check failed', err)
      setError(err.message)
    } finally {
      setIsRunningCheck(false)
    }
  }

  const handleTrackingUpdate = async (item, updates) => {
    try {
      await sendAction('update_tracking_item', { ...item, ...updates })
      await fetchCompliance()
    } catch (err) {
      console.error('Update tracking failed', err)
      setError(err.message)
    }
  }

  const handleDocumentUpdate = async (doc, updates) => {
    try {
      await sendAction('update_document', { ...doc, ...updates })
      await fetchCompliance()
    } catch (err) {
      console.error('Update document failed', err)
      setError(err.message)
    }
  }

  const handleResolveAlert = async (alertId) => {
    try {
      await sendAction('resolve_alert', { id: alertId })
      await fetchCompliance()
    } catch (err) {
      console.error('Resolve alert failed', err)
      setError(err.message)
    }
  }

  const handleCreateTracking = async (event) => {
    event.preventDefault()
    if (!trackingDraft.title || !trackingDraft.compliance_type) return
    try {
      await sendAction('create_tracking_item', {
        ...trackingDraft,
        status: 'pending'
      })
      setTrackingDraft({
        title: '',
        compliance_type: '',
        deadline_date: '',
        priority: 'medium',
        description: ''
      })
      await fetchCompliance()
    } catch (err) {
      console.error('Create tracking item failed', err)
      setError(err.message)
    }
  }

  const handleCreateDocument = async (event) => {
    event.preventDefault()
    if (!documentDraft.document_name || !documentDraft.document_type) return
    try {
      await sendAction('create_document', {
        ...documentDraft,
        status: 'missing'
      })
      setDocumentDraft({
        document_name: '',
        document_type: '',
        expiration_date: '',
        is_required: true
      })
      await fetchCompliance()
    } catch (err) {
      console.error('Create document failed', err)
      setError(err.message)
    }
  }

  const computedInsights = useMemo(() => {
    if (!data) return null
    const computed = data?.alerts?.computed || {}
    const totalOpenAlerts = Object.values(computed)
      .flat()
      .filter(Array.isArray)
      .reduce((acc, arr) => acc + arr.length, 0)
    return {
      totalOpenAlerts,
      activeAlerts: data?.alerts?.active?.length || 0,
      storedAlerts: data?.alerts?.recent?.length || 0
    }
  }, [data])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <RefreshCw className="h-8 w-8 animate-spin mb-3" />
        <p>Loading compliance overview…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6" />
          <div>
            <h3 className="font-semibold text-red-800">Compliance data unavailable</h3>
            <p>{error}</p>
          </div>
        </div>
        <button
          onClick={fetchCompliance}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { summary, alerts, tracking_items: trackingItems = [], documents = [], recurring_items: recurringItems = [], history = [], compliance_score: complianceScore, overall_status: overallStatus, analytics = [] } = data

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Compliance Command Center</h2>
          <p className="text-slate-600">Monitor requirements, documents, and recurring obligations in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCompliance}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={cx('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={handleRunCheck}
            disabled={isRunningCheck}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60"
          >
            <Sparkles className={cx('h-4 w-4', isRunningCheck && 'animate-spin')} />
            {isRunningCheck ? 'Running check…' : 'Run compliance check'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Overall Status"
          value={overallStatus?.toUpperCase?.() || 'UNKNOWN'}
          icon={ShieldCheck}
          theme={overallStatus === 'critical' ? 'critical' : overallStatus === 'warning' ? 'warning' : 'good'}
          description={`Score ${complianceScore ?? 0}%`}
        />
        <StatCard
          title="Tracking Items"
          value={`${summary?.pending_items ?? 0} open`}
          icon={ClipboardList}
          description={`${summary?.completed_items ?? 0} completed · ${summary?.overdue_count ?? 0} overdue`}
        />
        <StatCard
          title="Documents"
          value={`${summary?.missing_documents ?? 0} missing`}
          icon={FileText}
          description={`${summary?.verified_documents ?? 0} verified · ${summary?.expired_documents ?? 0} expired`}
        />
        <StatCard
          title="Recurring Tasks"
          value={`${summary?.total_recurring_items ?? 0}`}
          icon={CalendarClock}
          description={`${summary?.overdue_recurring ?? 0} overdue · ${recurringItems.filter(r => r.is_active).length} active`}
        />
      </section>

      {alerts && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-slate-900">Compliance Alerts</h3>
            </div>
            <div className="text-sm text-slate-500">
              {computedInsights?.activeAlerts || 0} active · {computedInsights?.storedAlerts || 0} recent
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(alerts?.computed || {}).map(([key, items]) => {
              if (!Array.isArray(items) || items.length === 0) return null
              return (
                <div key={key} className="border border-amber-200 bg-amber-50 rounded-md p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    {key.replace(/_/g, ' ')} ({items.length})
                  </div>
                  <ul className="text-sm text-amber-900 space-y-1">
                    {items.slice(0, 4).map(item => (
                      <li key={item.id || `${key}-${item.title}`}>{item.title || item.document_name || item.task_name || item.message}</li>
                    ))}
                    {items.length > 4 && (
                      <li className="text-xs text-amber-700">+{items.length - 4} more</li>
                    )}
                  </ul>
                </div>
              )
            })}
          </div>

          {alerts?.active?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-800">Active alerts</h4>
              <div className="space-y-2">
                {alerts.active.map(alert => (
                  <div key={alert.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-slate-200 rounded-md p-3">
                    <div>
                      <p className="font-medium text-slate-900">{alert.message}</p>
                      <p className="text-sm text-slate-500">{new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cx('px-2 py-1 rounded-full text-xs uppercase', priorityBadge[alert.severity] || 'bg-slate-100 text-slate-600')}>
                        {alert.severity}
                      </span>
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Compliance Tracking Items</h3>
            </div>
            <span className="text-sm text-slate-500">{trackingItems.length} total</span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {trackingItems.length === 0 && (
              <p className="text-sm text-slate-500">No compliance tasks yet. Create your first requirement below.</p>
            )}
            {trackingItems.map(item => (
              <div key={item.id} className="border border-slate-200 rounded-md p-4 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-slate-900">{item.title}</h4>
                    <p className="text-sm text-slate-500">{item.description || 'No description provided'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cx('px-2 py-1 rounded-full text-xs uppercase', priorityBadge[item.priority] || priorityBadge.medium)}>
                      {item.priority || 'medium'}
                    </span>
                    <span className={cx('px-2 py-1 rounded-full text-xs capitalize', statusColors[item.status] || statusColors.pending)}>
                      {item.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {formatDate(item.deadline_date)}
                  </div>
                  <div>{formatRelative(item.deadline_date)}</div>
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" /> {item.compliance_type}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.status !== 'completed' && (
                    <button
                      onClick={() => handleTrackingUpdate(item, { status: 'completed', completed_date: new Date().toISOString() })}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark complete
                    </button>
                  )}
                  {item.status !== 'pending' && (
                    <button
                      onClick={() => handleTrackingUpdate(item, { status: 'pending', completed_date: null })}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm border border-slate-200 rounded-md hover:bg-slate-50"
                    >
                      <Clock className="h-4 w-4" /> Reopen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateTracking} className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Add new compliance task</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  value={trackingDraft.title}
                  onChange={(e) => setTrackingDraft(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Quarterly report"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Compliance type</label>
                <input
                  type="text"
                  value={trackingDraft.compliance_type}
                  onChange={(e) => setTrackingDraft(prev => ({ ...prev, compliance_type: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="grant_reporting"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Deadline</label>
                <input
                  type="date"
                  value={trackingDraft.deadline_date}
                  onChange={(e) => setTrackingDraft(prev => ({ ...prev, deadline_date: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
                <select
                  value={trackingDraft.priority}
                  onChange={(e) => setTrackingDraft(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea
                value={trackingDraft.description}
                onChange={(e) => setTrackingDraft(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Outline key submission steps, required attachments, or approvals."
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Add tracking item
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-slate-900">Compliance Documents</h3>
            </div>
            <span className="text-sm text-slate-500">{documents.length} total</span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {documents.length === 0 && (
              <p className="text-sm text-slate-500">No documents tracked yet. Add required certifications or filings below.</p>
            )}
            {documents.map(doc => (
              <div key={doc.id} className="border border-slate-200 rounded-md p-4 space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-slate-900">{doc.document_name}</h4>
                    <p className="text-sm text-slate-500">{doc.document_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.is_required && <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700">Required</span>}
                    <span className={cx('px-2 py-1 rounded-full text-xs capitalize', statusColors[doc.status] || statusColors.pending)}>
                      {doc.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <CalendarClock className="h-4 w-4" /> {formatDate(doc.expiration_date)}
                  </div>
                  <div>{formatRelative(doc.expiration_date)}</div>
                  {doc.document_url && (
                    <a href={doc.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View document
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {doc.status !== 'verified' && (
                    <button
                      onClick={() => handleDocumentUpdate(doc, { status: 'verified', verification_date: new Date().toISOString() })}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark verified
                    </button>
                  )}
                  {doc.status !== 'missing' && (
                    <button
                      onClick={() => handleDocumentUpdate(doc, { status: 'missing', verification_date: null })}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm border border-slate-200 rounded-md hover:bg-slate-50"
                    >
                      <XCircle className="h-4 w-4" /> Mark missing
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateDocument} className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Add required document</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Document name</label>
                <input
                  type="text"
                  value={documentDraft.document_name}
                  onChange={(e) => setDocumentDraft(prev => ({ ...prev, document_name: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="SAM registration"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Document type</label>
                <input
                  type="text"
                  value={documentDraft.document_type}
                  onChange={(e) => setDocumentDraft(prev => ({ ...prev, document_type: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="sam_registration"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Expiration</label>
                <input
                  type="date"
                  value={documentDraft.expiration_date}
                  onChange={(e) => setDocumentDraft(prev => ({ ...prev, expiration_date: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  id="document-required"
                  type="checkbox"
                  checked={documentDraft.is_required}
                  onChange={(e) => setDocumentDraft(prev => ({ ...prev, is_required: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="document-required" className="text-xs text-slate-600">Required document</label>
              </div>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <UploadCloud className="h-4 w-4" /> Track document
            </button>
          </form>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900">Recurring Compliance Tasks</h3>
          </div>
          <span className="text-sm text-slate-500">{recurringItems.length} total</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recurringItems.length === 0 && (
            <p className="text-sm text-slate-500">No recurring compliance items configured yet.</p>
          )}
          {recurringItems.map(item => (
            <div key={item.id} className="border border-slate-200 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-900">{item.name}</h4>
                <span className={cx('px-2 py-1 text-xs uppercase rounded-full', item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                  {item.is_active ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-500">{item.description || 'No description provided'}</p>
              <div className="text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1"><RepeatIcon /> Every {item.frequency_interval || 1} {item.frequency}</div>
                <div className="flex items-center gap-1"><CalendarClock className="h-4 w-4" /> Next due {formatDate(item.next_due_date)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Recent compliance history</h3>
        </div>
        <div className="space-y-3">
          {history.length === 0 && <p className="text-sm text-slate-500">No compliance checks recorded yet.</p>}
          {history.map(entry => (
            <div key={entry.id} className="border border-slate-200 rounded-md p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{new Date(entry.check_date).toLocaleString()}</p>
                <p className="text-sm text-slate-500">Score {entry.compliance_score}%</p>
              </div>
              <span className={cx('px-3 py-1 text-xs uppercase rounded-full', statusColors[entry.overall_status] || statusColors.pending)}>
                {entry.overall_status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {analytics.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-sky-600" />
            <h3 className="font-semibold text-slate-900">Analytics snapshots</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.map(entry => (
              <div key={entry.id} className="border border-slate-200 rounded-md p-4 space-y-2">
                <p className="text-sm text-slate-500">{new Date(entry.report_date).toLocaleDateString()}</p>
                <pre className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-md p-2 overflow-x-auto">
                  {JSON.stringify(entry.report_data || {}, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ title, value, description, icon: Icon, theme = 'default' }) {
  const themeClasses = {
    default: 'bg-white border border-slate-200',
    good: 'bg-emerald-50 border border-emerald-200',
    warning: 'bg-amber-50 border border-amber-200',
    critical: 'bg-red-50 border border-red-200'
  }

  return (
  <div className={cx('rounded-lg p-4 space-y-2', themeClasses[theme] || themeClasses.default)}>
      <div className="flex items-center gap-2 text-slate-500 uppercase text-xs tracking-wide">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{description}</div>
    </div>
  )
}

function RepeatIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  )
}
