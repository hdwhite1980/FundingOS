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
  const [error, setError] = useState(null)
  
  // Determine if onboarding is still required based on flags plus actual required fields
  const needsOnboarding = (inv) => {
    if (!inv) return true
    const prefs = inv.investment_preferences || {}
    const flags = prefs.flags || {}
    const core = prefs.core || {}
    const preferences = prefs.preferences || {}

    // Core required fields (Step 1)
    const coreComplete = !!(
      flags.core_completed &&
      core.investment_range &&
      core.annual_investment_range &&
      Array.isArray(core.stages) && core.stages.length > 0 &&
      Array.isArray(core.industries) && core.industries.length > 0 &&
      core.experience_level &&
      core.accredited_status
    )

    // Preference required fields (Step 2)
    const prefsComplete = !!(
      flags.preferences_completed &&
      preferences.involvement_level &&
      preferences.decision_speed &&
      preferences.notification_frequency
    )

    // Enhancement completed (Step 3)
    const enhancementComplete = !!(flags.enhancement_completed)

    // Require all steps to be completed before accessing dashboard
    return !(coreComplete && prefsComplete && enhancementComplete)
  }

  useEffect(() => {
    if (!user) return
    
    const load = async () => {
      try {
        setLoading(true)
        const inv = await angelInvestorServices.getOrCreateAngelInvestor(user.id, user.email)
        setInvestor(inv)
        setShowOnboarding(needsOnboarding(inv))
        setError(null)
      } catch (e) {
        console.error('Angel onboarding load error', e)
        setError(e)
        // If we cannot load/create the profile, still prompt user with guidance instead of silent dashboard
        setShowOnboarding(true)
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

  if (showOnboarding && !investor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-semibold mb-3">Angel Investor Setup Blocked</h1>
          <p className="text-sm text-gray-600 mb-4">We couldn't create or load your angel investor profile. This is usually a Row Level Security (RLS) policy issue.</p>
          <div className="bg-white border rounded-lg p-4 text-left text-xs font-mono whitespace-pre-wrap mb-4">
{`Required policies (run in SQL editor):\n\nALTER TABLE angel_investors ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "ai select" ON angel_investors FOR SELECT USING (auth.uid() = user_id);\nCREATE POLICY "ai insert" ON angel_investors FOR INSERT WITH CHECK (auth.uid() = user_id);\nCREATE POLICY "ai update" ON angel_investors FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`}
          </div>
          {error && <p className="text-xs text-red-600 mb-4">{error.message}</p>}
          <button onClick={handleOnboardingComplete} className="btn-primary px-5 py-2 rounded text-sm">Retry</button>
        </div>
      </div>
    )
  }

  return <AngelInvestorDashboard />
}
