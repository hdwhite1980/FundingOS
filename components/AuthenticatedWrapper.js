// components/AuthenticatedWrapper.js
import React, { useState, useEffect } from 'react'
import { checkAuthStatus, authHelpers } from '../lib/supabase'

export const AuthenticatedWrapper = ({ 
  children, 
  fallback = null,
  loadingFallback = null,
  onAuthRequired = null 
}) => {
  const [authState, setAuthState] = useState({
    loading: true,
    authenticated: false,
    user: null,
    error: null,
    retryCount: 0
  })

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      // Wait for authentication with retries
      const session = await authHelpers.waitForAuth(5, 1000)
      
      setAuthState({
        loading: false,
        authenticated: true,
        user: session.user,
        error: null,
        retryCount: 0
      })
    } catch (error) {
      console.error('Authentication check failed:', error)
      
      setAuthState(prev => ({
        loading: false,
        authenticated: false,
        user: null,
        error: error.message,
        retryCount: prev.retryCount + 1
      }))

      if (onAuthRequired) {
        onAuthRequired(error)
      }
    }
  }

  const retry = () => {
    if (authState.retryCount < 3) {
      checkAuthentication()
    }
  }

  if (authState.loading) {
    return loadingFallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!authState.authenticated) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-4">
            {authState.error || 'Please log in to access this content.'}
          </p>
          
          {authState.retryCount < 3 && (
            <button 
              onClick={retry}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
            >
              Retry ({3 - authState.retryCount} attempts left)
            </button>
          )}
          
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return children
}

// Higher-order component version
export const withAuthentication = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    return (
      <AuthenticatedWrapper>
        <WrappedComponent {...props} />
      </AuthenticatedWrapper>
    )
  }
}

// Hook for safely calling authenticated services
export const useAuthenticatedService = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callService = async (serviceFunction, options = {}) => {
    const { showLoading = true, onError = null } = options
    
    if (showLoading) setLoading(true)
    setError(null)

    try {
      // Ensure we're authenticated before making the call
      await authHelpers.ensureAuthenticated()
      
      const result = await serviceFunction()
      return result
    } catch (err) {
      const errorMessage = err.message || 'Service call failed'
      setError(errorMessage)
      
      if (onError) {
        onError(err)
      } else {
        console.error('Service call error:', err)
      }
      
      throw err
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  return { callService, loading, error }
}

// Safe profile component that handles missing profiles
export const SafeProfileLoader = ({ children, onProfileLoaded = null }) => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const { callService } = useAuthenticatedService()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const profileData = await callService(
        async () => {
          const { userProfileService } = await import('../lib/supabase')
          return await userProfileService.getOrCreateProfile()
        },
        { showLoading: false }
      )
      
      setProfile(profileData)
      if (onProfileLoaded) {
        onProfileLoaded(profileData)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-600 mb-2">Failed to load profile</p>
        <button 
          onClick={loadProfile}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return children(profile)
}

// Example usage component
export const DashboardExample = () => {
  return (
    <AuthenticatedWrapper
      loadingFallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      }
      onAuthRequired={(error) => {
        console.log('Auth required, redirecting to login...', error)
        // Could redirect to login page here
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <SafeProfileLoader>
          {(profile) => (
            <div className="max-w-7xl mx-auto py-6 px-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Welcome back, {profile?.full_name || profile?.email || 'User'}!
              </h1>
              
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {profile.full_name || 'Not set'}</p>
                  <p><strong>Email:</strong> {profile.email}</p>
                  <p><strong>Organization:</strong> {profile.organization_name || 'Not set'}</p>
                  <p><strong>Type:</strong> {profile.organization_type}</p>
                </div>
              </div>
              
              {/* Your other dashboard components here */}
            </div>
          )}
        </SafeProfileLoader>
      </div>
    </AuthenticatedWrapper>
  )
}