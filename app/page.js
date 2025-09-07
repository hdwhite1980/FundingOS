// HomePage.js 
'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { directUserServices } from '../lib/supabase'
import AuthPage from '../components/AuthPage'
import OnboardingFlow from '../components/OnboardingFlow'
import Dashboard from '../components/Dashboard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function HomePage() {
  const { user, loading: authLoading, initializing } = useAuth()
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

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
      // Use directUserServices instead of mixing auth systems
      const profile = await directUserServices.profile.getOrCreateProfile(
        user.id, 
        user.email
      )
      
      console.log('HomePage: Profile result', profile)
      
      if (!profile) {
        setNeedsOnboarding(true)
      } else if (!profile.setup_completed) {
        setNeedsOnboarding(true)
        setUserProfile(profile)
      } else {
        setUserProfile(profile)
        setNeedsOnboarding(false)
      }
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

  // Show main dashboard
  return (
    <Dashboard 
      user={user}
      userProfile={userProfile}
      onProfileUpdate={setUserProfile}
    />
  )
}