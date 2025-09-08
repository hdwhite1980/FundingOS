import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, RefreshCcw, LogIn, User, Loader2, CheckCircle, XCircle } from 'lucide-react'

// Mock auth helpers - replace with your actual implementation
const mockAuthHelpers = {
  waitForAuth: async (retries, delay) => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    // Simulate random auth success/failure for demo
    if (Math.random() > 0.3) {
      return { user: { id: '1', email: 'user@example.com', name: 'John Doe' } }
    } else {
      throw new Error('Authentication failed')
    }
  },
  ensureAuthenticated: async () => {
    await new Promise(resolve => setTimeout(resolve, 500))
    if (Math.random() > 0.2) {
      return true
    } else {
      throw new Error('Authentication required')
    }
  }
}

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
      const session = await mockAuthHelpers.waitForAuth(5, 1000)
      
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="p-4 bg-emerald-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <Shield className="w-10 h-10 text-emerald-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying Authentication</h2>
          <p className="text-slate-600 mb-6">Please wait while we confirm your identity...</p>
          <div className="w-48 mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!authState.authenticated) {
    return fallback || (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="p-4 bg-red-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication Required</h2>
            <p className="text-slate-600">
              {authState.error || 'Please log in to access this content.'}
            </p>
          </div>
          
          <div className="space-y-3">
            {authState.retryCount < 3 && (
              <button 
                onClick={retry}
                className="w-full px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200 flex items-center justify-center"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Retry ({3 - authState.retryCount} attempts remaining)
              </button>
            )}
            
            <button 
              onClick={() => window.location.href = '/login'}
              className="w-full px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors duration-200 flex items-center justify-center"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Go to Login
            </button>
          </div>

          {authState.retryCount >= 3 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-4 h-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Maximum retry attempts reached</p>
                  <p>Please try logging in again or contact support if the issue persists.</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
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
      await mockAuthHelpers.ensureAuthenticated()
      
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
          // Mock profile service call
          await new Promise(resolve => setTimeout(resolve, 1000))
          if (Math.random() > 0.2) {
            return {
              id: '1',
              email: 'user@example.com',
              full_name: 'John Doe',
              organization_name: 'Acme Corp',
              organization_type: 'startup'
            }
          } else {
            throw new Error('Failed to load profile')
          }
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
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="p-3 bg-emerald-50 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <User className="w-6 h-6 text-emerald-600 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-700">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
        <div className="p-3 bg-red-50 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to Load Profile</h3>
        <p className="text-slate-600 mb-4">{error}</p>
        <button 
          onClick={loadProfile}
          className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors duration-200"
        >
          Try Again
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
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="p-4 bg-emerald-50 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Loading Dashboard</h2>
            <p className="text-slate-600">Preparing your personalized experience...</p>
          </motion.div>
        </div>
      }
      onAuthRequired={(error) => {
        console.log('Auth required, redirecting to login...', error)
        // Could redirect to login page here
      }}
    >
      <div className="min-h-screen bg-slate-50">
        <SafeProfileLoader>
          {(profile) => (
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    Welcome back, {profile?.full_name || profile?.email || 'User'}!
                  </h1>
                  <p className="text-slate-600">Here's what's happening with your projects today.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Profile Card */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-emerald-50 rounded-lg mr-3">
                          <User className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs font-medium text-slate-500 block mb-1">Name</span>
                          <span className="text-sm font-medium text-slate-900">{profile.full_name || 'Not set'}</span>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500 block mb-1">Email</span>
                          <span className="text-sm font-medium text-slate-900">{profile.email}</span>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500 block mb-1">Organization</span>
                          <span className="text-sm font-medium text-slate-900">{profile.organization_name || 'Not set'}</span>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-slate-500 block mb-1">Type</span>
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium capitalize">
                            {profile.organization_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Cards */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-emerald-50 rounded-lg mr-3">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">Authentication Status</h3>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div>
                          <p className="font-medium text-emerald-900">Successfully Authenticated</p>
                          <p className="text-sm text-emerald-700">Your session is secure and active</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors duration-200 text-left">
                          <h4 className="font-medium text-slate-900 mb-1">View Projects</h4>
                          <p className="text-sm text-slate-600">Manage your active projects</p>
                        </button>
                        <button className="p-4 border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors duration-200 text-left">
                          <h4 className="font-medium text-slate-900 mb-1">Find Opportunities</h4>
                          <p className="text-sm text-slate-600">Discover new funding sources</p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </SafeProfileLoader>
      </div>
    </AuthenticatedWrapper>
  )
}