'use client'
import AngelInvestorDashboard from '../../../components/AngelInvestorDashboard'
import { useAuth } from '../../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { angelInvestorServices } from '../lib/supabase'
import { useEffect, useState } from 'react'

// Test the needsOnboarding function
const needsOnboarding = (inv) => {
  if (!inv) return true
  
  console.log('AngelDashboard: Checking needsOnboarding with investor:', inv)

  // For backward compatibility, also check the JSON structure
  const prefs = inv.investment_preferences || {}
  const flags = prefs.flags || {}

  // Core required fields (Step 1) - check direct fields on investor record OR JSON fallback
  const coreComplete = Boolean(
    (inv.core_completed || flags.core_completed) &&
    inv.investment_range &&
    inv.annual_investment_range &&
    Array.isArray(inv.stages) && inv.stages.length > 0 &&
    Array.isArray(inv.industries) && inv.industries.length > 0 &&
    inv.experience_level &&
    inv.accredited_status !== null
  )

  // Preference required fields (Step 2) - check direct fields on investor record OR JSON fallback
  const prefsComplete = Boolean(
    (inv.preferences_completed || flags.preferences_completed) &&
    inv.involvement_level &&
    inv.decision_speed &&
    inv.notification_frequency
  )

  // Enhancement completed (Step 3) - check direct field on investor record OR JSON fallback
  const enhancementComplete = Boolean(inv.enhancement_completed || flags.enhancement_completed)

  const result = !(coreComplete && prefsComplete && enhancementComplete)
  
  console.log('AngelDashboard: Completion status:', {
    coreComplete,
    prefsComplete,
    enhancementComplete,
    finalResult: result
  })

  return result
}

export default function AngelDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [investor, setInvestor] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)

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
        
        // Test needsOnboarding logic
        const needsOnboardingResult = needsOnboarding(inv)
        console.log('AngelDashboard: Needs onboarding?', needsOnboardingResult)
        setShowOnboarding(needsOnboardingResult)
        
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
    <div className="min-h-screen">
      {/* Back to the full dashboard with fixes applied */}
      {!showOnboarding ? (
        <AngelInvestorDashboard />
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-4">Should Show Onboarding</h1>
            <p className="text-gray-600">But this shouldn't happen since all flags are true</p>
          </div>
        </div>
      )}
    </div>
  )
}
