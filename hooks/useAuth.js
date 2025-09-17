// hooks/useAuth.js
import { useState, useEffect, useContext, createContext } from 'react'
import { supabase } from '../lib/supabase'
import sessionManager from '../lib/sessionManager'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
      } finally {
        setLoading(false)
        setInitializing(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Handle specific auth events
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.id)
          // Track new session and deactivate others
          if (session?.user?.id && session?.access_token) {
            try {
              await sessionManager.trackUserSession(session.user.id, {
                access_token: session.access_token,
                ip_address: null, // Would need to get from request
                user_agent: navigator?.userAgent
              })
            } catch (error) {
              console.error('Error tracking session:', error)
              // Don't block login for session tracking errors
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          // Deactivate session
          if (user?.id && session?.access_token) {
            try {
              const sessionId = sessionManager.extractSessionId(session.access_token)
              await sessionManager.deactivateSession(user.id, sessionId)
            } catch (error) {
              console.error('Error deactivating session:', error)
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed')
          // Update session activity
          if (session?.user?.id && session?.access_token) {
            try {
              const sessionId = sessionManager.extractSessionId(session.access_token)
              await sessionManager.updateSessionActivity(session.user.id, sessionId)
            } catch (error) {
              console.error('Error updating session activity:', error)
            }
          }
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, options = {}) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options
      })
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) throw error
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
    } catch (error) {
      console.error('Error updating password:', error)
      throw error
    }
  }

  const forgotPassword = async (email) => {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      return result
    } catch (error) {
      console.error('Error requesting password reset:', error)
      throw error
    }
  }

  const resetPasswordWithCode = async (email, code, newPassword) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email,
          code,
          newPassword
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      return result
    } catch (error) {
      console.error('Error resetting password with code:', error)
      throw error
    }
  }

  const exchangeResetToken = async (hashFragment) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exchange',
          code: hashFragment
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error)
      }

      return result
    } catch (error) {
      console.error('Error exchanging reset token:', error)
      throw error
    }
  }

  const value = {
    user,
    session,
    loading,
    initializing,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    forgotPassword,
    resetPasswordWithCode,
    exchangeResetToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protected routes
export const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const { user, loading, initializing } = useAuth()
    
    if (initializing || loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    }
    
    if (!user) {
      // Redirect to login or show login form
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access this page.</p>
          </div>
        </div>
      )
    }
    
    return <WrappedComponent {...props} />
  }
}

// Hook for handling authenticated API calls
export const useAuthenticatedAction = () => {
  const { user, session } = useAuth()
  
  const executeAction = async (action, errorMessage = 'Action failed') => {
    try {
      if (!user || !session) {
        throw new Error('Please log in to perform this action')
      }
      
      return await action()
    } catch (error) {
      console.error(errorMessage, error)
      throw error
    }
  }
  
  return { executeAction, isAuthenticated: !!user }
}

// Utility component for conditional rendering based on auth state
export const AuthGuard = ({ 
  children, 
  fallback = null, 
  requireAuth = true,
  loading: customLoading = null 
}) => {
  const { user, loading, initializing } = useAuth()
  
  if (initializing || loading) {
    return customLoading || (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  if (requireAuth && !user) {
    return fallback
  }
  
  if (!requireAuth && user) {
    return fallback
  }
  
  return children
}