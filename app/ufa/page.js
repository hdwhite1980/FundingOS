'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UnifiedFundingIntelligenceDashboard from '@/components/UnifiedFundingIntelligenceDashboard'
import { Brain, Shield, Users, TrendingUp, ArrowLeft } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function UFAPage() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/')
        return
      }

      setUser(user)

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileError && profile) {
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 animate-pulse text-emerald-600" />
          <span className="text-xl">Loading UFA Intelligence...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access the UFA Intelligence Dashboard</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <Brain className="w-8 h-8 text-emerald-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Unified Funding Agent
                </h1>
                <p className="text-sm text-gray-500">
                  AI-Powered Strategic Intelligence
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {userProfile?.company_name || 'Your Organization'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UnifiedFundingIntelligenceDashboard 
          tenantId={userProfile?.tenant_id || user?.user_metadata?.tenant_id || user?.id || 'default-tenant'} 
        />
      </div>
    </div>
  )
}