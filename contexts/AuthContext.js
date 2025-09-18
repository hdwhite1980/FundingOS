// contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useSessionContext, useSupabaseClient } from '@supabase/auth-helpers-react'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const { session, isLoading } = useSessionContext()
  const supabase = useSupabaseClient()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    console.log('AuthContext: Starting initialization')
    
    // Set user from session
    if (session?.user) {
      console.log('AuthContext: Initial session retrieved:', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      })
      setUser(session.user)
    } else {
      setUser(null)
    }

    console.log('AuthContext: Initialization complete')
    setLoading(false)
    setInitializing(false)
  }, [session])

  useEffect(() => {
    if (!isLoading) {
      setLoading(false)
      setInitializing(false)
    }
  }, [isLoading])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Auth state changed:', {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        })
        setUser(session?.user ?? null)
        setLoading(false)
        setInitializing(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    try {
      // Use our custom logout endpoint that handles chat session cleanup and email
      const response = await fetch('/api/chat/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Include cookies for authentication
      })
      
      if (!response.ok) {
        // If our endpoint fails, fall back to regular logout
        console.warn('Custom logout endpoint failed, using fallback')
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      }
      
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const value = {
    user,
    session,
    loading,
    initializing,
    isAuthenticated: !!user,
    signOut
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