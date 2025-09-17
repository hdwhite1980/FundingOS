// hooks/useSecurityData.js
// Custom hook to fetch all security data using the working endpoint
import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

export function useSecurityData() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [securityData, setSecurityData] = useState({
    twoFactor: { enabled: false, configured: false },
    sessions: [],
    devices: [],
    user: null
  })

  const fetchSecurityData = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/user-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id })
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch security data: ${response.status}`)
      }

      const data = await response.json()
      setSecurityData({
        twoFactor: data.twoFactor || { enabled: false, configured: false },
        sessions: data.sessions || [],
        devices: data.devices || [],
        user: data.user || { id: user.id }
      })

    } catch (err) {
      console.error('Error fetching security data:', err)
      setError(err.message)
      
      // Fallback to empty data structure
      setSecurityData({
        twoFactor: { enabled: false, configured: false },
        sessions: [],
        devices: [],
        user: user ? { id: user.id } : null
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch data when user changes
  useEffect(() => {
    fetchSecurityData()
  }, [user?.id])

  // Return data and refetch function
  return {
    loading,
    error,
    securityData,
    refetch: fetchSecurityData,
    // Individual data pieces for easier component usage
    twoFactorEnabled: securityData.twoFactor?.enabled || false,
    twoFactorConfigured: securityData.twoFactor?.configured || false,
    sessions: securityData.sessions || [],
    devices: securityData.devices || [],
    user: securityData.user
  }
}