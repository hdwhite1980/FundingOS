// HomePage.js 
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
// Removed direct import to prevent multiple Supabase clients
import AuthPage from '../components/AuthPage'
import OnboardingFlow from '../components/EnhancedOnboardingFlow'
import Dashboard from '../components/Dashboard'
import AngelInvestorDashboard from '../components/AngelInvestorDashboard'
import GrantWriterDashboard from '../components/GrantWriterDashboard'
import CompanyDashboard from '../components/CompanyDashboard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function HomePage() {
  const { user, loading: authLoading, initializing } = useAuth()
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const router = useRouter()

  useEffect(() => {
    console.log('HomePage: Auth state changed', {
      user: user ? { id: user.id, email: user.email } : null,
      authLoading,
      initializing
    })

    // Wait for auth to be ready
    if (authLoading || initializing) {
      return
    }

    if (user) {
      checkUserProfile()
    } else {
      setLoading(false)
    }
  }, [user, authLoading, initializing])

  const checkUserProfile = async () => {
    try {
      console.log('HomePage: Checking user profile for', user.id)
      // Use the user context data directly since we have session
      if (!user || !user.id) {
        throw new Error('No user session')
      }

      // Simple client-side profile check using the session context
      // We'll create a profile if it doesn't exist
      const profile = {
        id: user.id,
        email: user.email,
        user_role: user.user_metadata?.user_role || 'company',
        setup_completed: false // This will trigger onboarding
      }
      
      console.log('HomePage: Profile result', profile)
      
      // For now, always go to onboarding to properly set up the profile
      setUserProfile(profile)
      setNeedsOnboarding(true)
    } catch (error) {
      console.error('HomePage: Error checking user profile:', error)
      setNeedsOnboarding(true)
    } finally {
      setLoading(false)
    }
  }

  const handleOnboardingComplete = (profile) => {
    setUserProfile(profile)
    setNeedsOnboarding(false)
  }

  // Role sync is now handled during profile creation above

  // Handle angel investor redirect
  useEffect(() => {
    if (!authLoading && !initializing && !loading && user && !needsOnboarding && userProfile) {
      const role = userProfile.user_role || user.user_metadata?.user_role
      if (role === 'angel_investor') {
        router.replace('/angel/dashboard')
      }
    }
  }, [authLoading, initializing, loading, user, needsOnboarding, userProfile, router])

  // Show loading while auth is initializing
  if (authLoading || initializing || loading) {
    return <LoadingSpinner />
  }

  // Show auth page if no user
  if (!user) {
    return <AuthPage />
  }

  // Show onboarding if needed
  if (needsOnboarding) {
    return (
      <OnboardingFlow 
        user={user}
        existingProfile={userProfile}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  // Route to dashboard by role (fallback to company)
  const role = userProfile?.user_role || user.user_metadata?.user_role || 'company'
  
  // For angel investors, show loading while redirect happens
  if (role === 'angel_investor') {
    return <LoadingSpinner />
  }
  if (role === 'grant_writer') {
    return <GrantWriterDashboard user={user} userProfile={userProfile} />
  }
  return (
    <CompanyDashboard
      user={user}
      userProfile={userProfile}
      onProfileUpdate={setUserProfile}
    />
  )
}