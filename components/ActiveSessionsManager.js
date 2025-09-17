'use client'
import { useState, useEffect } from 'react'
import { Monitor, Smartphone, Globe, Calendar, MapPin, X, Shield, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export default function ActiveSessionsManager() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [terminating, setTerminating] = useState(new Set())

  const loadSessions = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/auth/sessions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load sessions')
      }

      const data = await response.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Error loading sessions:', error)
      
      // Check if this is a schema error (table doesn't exist yet)
      if (error.message?.includes('user_sessions') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('device_fingerprint')) {
        console.log('Sessions table not ready yet - this is expected during database setup')
        setSessions([])
      } else {
        toast.error('Failed to load active sessions')
      }
    } finally {
      setLoading(false)
    }
  }

  const terminateSession = async (sessionId) => {
    if (!user?.id || terminating.has(sessionId)) return

    try {
      setTerminating(prev => new Set([...prev, sessionId]))
      
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })

      if (!response.ok) {
        throw new Error('Failed to terminate session')
      }

      toast.success('Session terminated successfully')
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    } catch (error) {
      console.error('Error terminating session:', error)
      toast.error('Failed to terminate session')
    } finally {
      setTerminating(prev => {
        const next = new Set(prev)
        next.delete(sessionId)
        return next
      })
    }
  }

  const terminateAllOtherSessions = async () => {
    if (!user?.id || sessions.length <= 1) return

    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ terminateAll: true })
      })

      if (!response.ok) {
        throw new Error('Failed to terminate sessions')
      }

      toast.success('All other sessions terminated')
      await loadSessions()
    } catch (error) {
      console.error('Error terminating all sessions:', error)
      toast.error('Failed to terminate all sessions')
    }
  }

  useEffect(() => {
    loadSessions()
  }, [user?.id])

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return Globe
    const ua = userAgent.toLowerCase()
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return Smartphone
    }
    return Monitor
  }

  const getDeviceInfo = (userAgent) => {
    if (!userAgent) return 'Unknown Device'
    
    const ua = userAgent.toLowerCase()
    let device = 'Desktop'
    let browser = 'Unknown Browser'
    let os = 'Unknown OS'

    // Device type
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      device = 'Mobile'
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      device = 'Tablet'
    }

    // Browser
    if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('edge')) browser = 'Edge'

    // OS
    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('mac')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

    return `${device} • ${browser} on ${os}`
  }

  const formatLastActivity = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${diffDays} days ago`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center p-4 bg-slate-50 rounded-lg mb-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded mb-2 w-1/3"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Active Sessions</h3>
          <p className="text-sm text-slate-600 mt-1">
            Manage where you're signed in across all your devices
          </p>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={terminateAllOtherSessions}
            className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Sign out all others</span>
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No active sessions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.user_agent)
            const isCurrentSession = session.is_current // We'll need to add this logic
            
            return (
              <div
                key={session.session_id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isCurrentSession 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isCurrentSession ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <DeviceIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-slate-900">
                        {getDeviceInfo(session.user_agent)}
                      </h4>
                      {isCurrentSession && (
                        <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-md">
                          This device
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                      {session.ip_address && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{session.ip_address}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Last active {formatLastActivity(session.last_activity)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isCurrentSession && (
                  <button
                    onClick={() => terminateSession(session.session_id)}
                    disabled={terminating.has(session.session_id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Sign out this device"
                  >
                    {terminating.has(session.session_id) ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Security Tips</h4>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• Sign out sessions on shared or public computers</li>
              <li>• Regularly review your active sessions</li>
              <li>• Terminate any sessions you don't recognize</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}