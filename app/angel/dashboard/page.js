'use client'
import AngelInvestorDashboard from '../../../components/AngelInvestorDashboard'
import AngelInvestorOnboarding from '../../../components/AngelInvestorOnboarding'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { angelInvestorServices } from '../../../lib/supabase'
import { useEffect, useState } from 'react'

export default function AngelDashboardPage() {
  const { user } = useAuth()
  const [investor, setInvestor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Determine if onboarding is still required based on flags plus actual required fields
  const needsOnboarding = (inv) => {
    if (!inv) return true
    const prefs = inv.investment_preferences || {}
    const flags = prefs.flags || {}
    const core = prefs.core || {}
    const preferences = prefs.preferences || {}

    // Core required fields
    const coreComplete = !!(
      flags.core_completed &&
      core.investment_range &&
      core.annual_investment_range &&
      Array.isArray(core.stages) && core.stages.length > 0 &&
      Array.isArray(core.industries) && core.industries.length > 0 &&
      core.experience_level &&
      core.accredited_status
    )

    // Preference required fields
    const prefsComplete = !!(
      flags.preferences_completed &&
      preferences.involvement_level &&
      preferences.decision_speed &&
      preferences.notification_frequency
    )

    return !(coreComplete && prefsComplete)
  }

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        setLoading(true)
        const inv = await angelInvestorServices.getOrCreateAngelInvestor(user.id, user.email)
        setInvestor(inv)
        setShowOnboarding(needsOnboarding(inv))
      } catch (e) {
        console.error('Angel onboarding load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // Callback after onboarding completes – refetch to ensure freshest data
  const handleOnboardingComplete = async () => {
    try {
      setLoading(true)
      const refreshed = await angelInvestorServices.getOrCreateAngelInvestor(user.id, user.email)
      setInvestor(refreshed)
      setShowOnboarding(needsOnboarding(refreshed))
    } catch (e) {
      console.error('Post-onboarding refresh error', e)
      setShowOnboarding(false) // fail-safe: allow dashboard access
    } finally {
      setLoading(false)
    }
  }

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

  if (showOnboarding && investor) {
    return <AngelInvestorOnboarding user={user} investor={investor} onComplete={handleOnboardingComplete} />
  }

  return <AngelInvestorDashboard />
}
