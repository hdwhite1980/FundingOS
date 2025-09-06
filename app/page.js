// HomePage.js 
'use client'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useEffect, useState } from 'react'
import { directUserServices } from '../lib/supabase'
import AuthPage from '../components/AuthPage'
import OnboardingFlow from '../components/OnboardingFlow'
import Dashboard from '../components/Dashboard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function HomePage() {
  const session = useSession()
  const supabase = useSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    if (session?.user) {
      checkUserProfile()
    } else {
      setLoading(false)
    }
  }, [session])

  const checkUserProfile = async () => {
    try {
      // FIXED: Use directUserServices instead of userProfileService
      const profile = await directUserServices.profile.getOrCreateProfile(
        session.user.id, 
        session.user.email
      )
      
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
      console.error('Error checking user profile:', error)
      setNeedsOnboarding(true)
    } finally {
      setLoading(false)
    }
  }

  const handleOnboardingComplete = (profile) => {
    setUserProfile(profile)
    setNeedsOnboarding(false)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!session) {
    return <AuthPage />
  }

  if (needsOnboarding) {
    return (
      <OnboardingFlow 
        user={session.user}
        existingProfile={userProfile}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  return (
    <Dashboard 
      user={session.user}
      userProfile={userProfile}
      onProfileUpdate={setUserProfile}
    />
  )
}