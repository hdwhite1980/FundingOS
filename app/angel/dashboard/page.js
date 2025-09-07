'use client'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AngelDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Minimal useEffect for testing
  useEffect(() => {
    console.log('AngelDashboard: useEffect triggered with user:', user?.id)
    setLoading(false)
  }, [user?.id])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading investor profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Angel Dashboard - Test Mode</h1>
        <p className="text-gray-600 mb-4">User ID: {user?.id}</p>
        <p className="text-gray-600">Email: {user?.email}</p>
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            If you see this without React errors, the issue was in the imported components or complex logic.
          </p>
        </div>
      </div>
    </div>
  )
}
