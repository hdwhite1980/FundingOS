'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { useTenant } from '@/hooks/useTenant'
import UnifiedFundingIntelligenceDashboard from '@/components/UnifiedFundingIntelligenceDashboard'
import { Brain, Shield, Users, TrendingUp } from 'lucide-react'

export default function UFAPage() {
  const { user, loading: userLoading } = useUser()
  const { tenant, loading: tenantLoading } = useTenant()

  if (userLoading || tenantLoading) {
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
          <p className="text-gray-600">Please sign in to access the UFA Intelligence Dashboard</p>
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
                  {tenant?.company_name || 'Your Organization'}
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
          tenantId={tenant?.id || 'default-tenant'} 
        />
      </div>
    </div>
  )
}