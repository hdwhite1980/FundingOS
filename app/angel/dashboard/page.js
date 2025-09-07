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

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        setLoading(true)
        const inv = await angelInvestorServices.getOrCreateAngelInvestor(user.id, user.email)
        setInvestor(inv)
        const prefs = inv?.investment_preferences || {}
        const flags = prefs.flags || {}
        if (!flags.core_completed || !flags.preferences_completed) {
          setShowOnboarding(true)
        }
      } catch (e) {
        console.error('Angel onboarding load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

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
    return <AngelInvestorOnboarding user={user} investor={investor} onComplete={() => setShowOnboarding(false)} />
  }

  return <AngelInvestorDashboard />
}
