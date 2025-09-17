'use client'
import { useState, useEffect } from 'react'
import { Monitor, Smartphone, Tablet, Globe, MapPin, Calendar, Shield, Trash2, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export default function DeviceManager() {
  const { user } = useAuth()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [trusting, setTrusting] = useState(new Set())
  const [removing, setRemoving] = useState(new Set())

  const loadDevices = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/auth/devices', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load devices')
      }

      const data = await response.json()
      setDevices(data.devices || [])
    } catch (error) {
      console.error('Error loading devices:', error)
      toast.error('Failed to load trusted devices')
    } finally {
      setLoading(false)
    }
  }

  const trustDevice = async (deviceId) => {
    if (!user?.id || trusting.has(deviceId)) return

    try {
      setTrusting(prev => new Set([...prev, deviceId]))
      
      const response = await fetch('/api/auth/devices', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          deviceId, 
          action: 'trust' 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to trust device')
      }

      toast.success('Device marked as trusted')
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, is_trusted: true, trusted_at: new Date().toISOString() }
          : device
      ))
    } catch (error) {
      console.error('Error trusting device:', error)
      toast.error('Failed to trust device')
    } finally {
      setTrusting(prev => {
        const next = new Set(prev)
        next.delete(deviceId)
        return next
      })
    }
  }

  const untrustDevice = async (deviceId) => {
    if (!user?.id || trusting.has(deviceId)) return

    try {
      setTrusting(prev => new Set([...prev, deviceId]))
      
      const response = await fetch('/api/auth/devices', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          deviceId, 
          action: 'untrust' 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to untrust device')
      }

      toast.success('Device trust removed')
      setDevices(prev => prev.map(device => 
        device.id === deviceId 
          ? { ...device, is_trusted: false, trusted_at: null }
          : device
      ))
    } catch (error) {
      console.error('Error untrusting device:', error)
      toast.error('Failed to untrust device')
    } finally {
      setTrusting(prev => {
        const next = new Set(prev)
        next.delete(deviceId)
        return next
      })
    }
  }

  const removeDevice = async (deviceId) => {
    if (!user?.id || removing.has(deviceId)) return

    if (!confirm('Are you sure you want to remove this device? This will sign out all sessions on this device.')) {
      return
    }

    try {
      setRemoving(prev => new Set([...prev, deviceId]))
      
      const response = await fetch('/api/auth/devices', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId })
      })

      if (!response.ok) {
        throw new Error('Failed to remove device')
      }

      toast.success('Device removed successfully')
      setDevices(prev => prev.filter(device => device.id !== deviceId))
    } catch (error) {
      console.error('Error removing device:', error)
      toast.error('Failed to remove device')
    } finally {
      setRemoving(prev => {
        const next = new Set(prev)
        next.delete(deviceId)
        return next
      })
    }
  }

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return Smartphone
      case 'tablet': return Tablet
      case 'desktop': return Monitor
      default: return Globe
    }
  }

  const getDeviceInfo = (userAgent) => {
    if (!userAgent) return { type: 'unknown', browser: 'Unknown Browser', os: 'Unknown OS' }
    
    const ua = userAgent.toLowerCase()
    let type = 'desktop'
    let browser = 'Unknown Browser'
    let os = 'Unknown OS'

    // Device type
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      type = 'mobile'
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      type = 'tablet'
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

    return { type, browser, os }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
    loadDevices()
  }, [user?.id])

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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center space-x-2">
          <Monitor className="w-5 h-5 text-emerald-600" />
          <span>Trusted Devices</span>
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Manage devices that you trust for accessing your account
        </p>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No devices registered yet</p>
          <p className="text-xs mt-1">Devices will appear here as you use them to sign in</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const deviceInfo = getDeviceInfo(device.user_agent)
            const DeviceIcon = getDeviceIcon(deviceInfo.type)
            const isTrusted = device.is_trusted
            
            return (
              <div
                key={device.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isTrusted 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isTrusted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <DeviceIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-slate-900">
                        {deviceInfo.browser} on {deviceInfo.os}
                      </h4>
                      {isTrusted && (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      )}
                      {device.is_current && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                      {device.last_ip && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{device.last_ip}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Last seen {formatDate(device.last_seen)}</span>
                      </div>
                      {isTrusted && device.trusted_at && (
                        <div className="text-emerald-600">
                          Trusted {formatDate(device.trusted_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => isTrusted ? untrustDevice(device.id) : trustDevice(device.id)}
                    disabled={trusting.has(device.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      isTrusted
                        ? 'text-yellow-600 hover:bg-yellow-50 border border-yellow-200'
                        : 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    {trusting.has(device.id) ? (
                      <div className="flex items-center space-x-1">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        <span>Working...</span>
                      </div>
                    ) : isTrusted ? (
                      <>
                        <XCircle className="w-4 h-4 inline mr-1" />
                        Untrust
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                        Trust
                      </>
                    )}
                  </button>

                  {!device.is_current && (
                    <button
                      onClick={() => removeDevice(device.id)}
                      disabled={removing.has(device.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove device"
                    >
                      {removing.has(device.id) ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">About Trusted Devices</h4>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• Trusted devices can bypass some security checks</li>
              <li>• Only trust devices that you own and control</li>
              <li>• Remove trust from shared or compromised devices</li>
              <li>• Device fingerprints help identify unique devices</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}