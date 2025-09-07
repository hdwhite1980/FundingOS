'use client'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { angelInvestorServices } from '../../../lib/supabase'
import { useEffect, useState } from 'react'

export default function AngelDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [investor, setInvestor] = useState(null)

  // Test the service call
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const loadInvestor = async () => {
      try {
        console.log('AngelDashboard: Loading investor for user:', user?.id)
        const inv = await angelInvestorServices.getOrCreateAngelInvestor(user.id, user.email)
        console.log('AngelDashboard: Investor loaded:', inv)
        setInvestor(inv)
        setError(null)
      } catch (e) {
        console.error('Angel investor load error:', e)
        setError(e)
      } finally {
        setLoading(false)
      }
    }

    loadInvestor()
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4 text-red-600">Error Loading Profile</h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Angel Dashboard - Service Test</h1>
        <p className="text-gray-600 mb-4">User ID: {user?.id}</p>
        <p className="text-gray-600 mb-4">Email: {user?.email}</p>
        
        {investor && (
          <div className="mt-8 p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">Investor Data Loaded:</h3>
            <p className="text-sm text-green-700">Name: {investor.name}</p>
            <p className="text-sm text-green-700">Core Completed: {String(investor.core_completed)}</p>
            <p className="text-sm text-green-700">Preferences Completed: {String(investor.preferences_completed)}</p>
            <p className="text-sm text-green-700">Enhancement Completed: {String(investor.enhancement_completed)}</p>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Testing angelInvestorServices.getOrCreateAngelInvestor - checking for infinite loops...
          </p>
        </div>
      </div>
    </div>
  )
}
