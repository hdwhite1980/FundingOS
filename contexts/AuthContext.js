// contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
        setInitializing(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const value = {
    user,
    session,
    loading,
    initializing,
    isAuthenticated: !!user
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

// components/AuthGuard.js
import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export const AuthGuard = ({ 
  children, 
  fallback = null, 
  loadingFallback = null,
  requireAuth = true 
}) => {
  const { user, loading, initializing } = useAuth()
  
  if (initializing || loading) {
    return loadingFallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (requireAuth && !user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access this content.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }
  
  return children
}

// hooks/useAuthenticatedService.js
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export const useAuthenticatedService = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user, isAuthenticated } = useAuth()

  const callService = async (serviceFunction, options = {}) => {
    const { 
      showLoading = true, 
      onError = null,
      requireAuth = true 
    } = options
    
    if (showLoading) setLoading(true)
    setError(null)

    try {
      // Check if auth is required and user is authenticated
      if (requireAuth && !isAuthenticated) {
        throw new Error('Authentication required - please log in')
      }
      
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

  return { callService, loading, error, isAuthenticated }
}

// hooks/useProfile.js
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { userProfileService } from '../lib/supabase'

export const useProfile = (autoLoad = true) => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (autoLoad && isAuthenticated && user) {
      loadProfile()
    }
  }, [autoLoad, isAuthenticated, user])

  const loadProfile = async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping profile load')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const profileData = await userProfileService.getOrCreateProfile({
        full_name: user?.user_metadata?.full_name || '',
        email: user?.email || ''
      })
      setProfile(profileData)
    } catch (err) {
      console.error('Profile load error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required')
    }

    try {
      const updatedProfile = await userProfileService.updateProfile(user.id, updates)
      setProfile(updatedProfile)
      return updatedProfile
    } catch (err) {
      console.error('Profile update error:', err)
      setError(err.message)
      throw err
    }
  }

  const createProfile = async (profileData) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required')
    }

    try {
      const newProfile = await userProfileService.createProfile(profileData)
      setProfile(newProfile)
      return newProfile
    } catch (err) {
      console.error('Profile creation error:', err)
      setError(err.message)
      throw err
    }
  }

  return {
    profile,
    loading,
    error,
    loadProfile,
    updateProfile,
    createProfile,
    isAuthenticated
  }
}

// components/Dashboard.js - Example component using the new patterns
import React from 'react'
import { AuthGuard } from './AuthGuard'
import { useProfile } from '../hooks/useProfile'
import { useAuth } from '../contexts/AuthContext'

const Dashboard = () => {
  const { user } = useAuth()
  const { profile, loading, error, loadProfile } = useProfile(true)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Error loading profile: {error}</p>
        <button 
          onClick={loadProfile}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Welcome back, {profile?.full_name || user?.email || 'User'}!
        </h1>
        
        {profile && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
            <div className="space-y-2">
              <p><strong>Name:</strong> {profile.full_name || 'Not set'}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Organization:</strong> {profile.organization_name || 'Not set'}</p>
              <p><strong>Type:</strong> {profile.organization_type}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Wrap the Dashboard with AuthGuard
const AuthenticatedDashboard = () => (
  <AuthGuard>
    <Dashboard />
  </AuthGuard>
)

export { AuthenticatedDashboard }

// App.js - How to set up your main app
import React from 'react'
import { AuthProvider } from './contexts/AuthContext'
import AuthenticatedDashboard from './components/Dashboard'

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AuthenticatedDashboard />
      </div>
    </AuthProvider>
  )
}

export default App

// Example: Projects component with proper auth handling
import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAuthenticatedService } from '../hooks/useAuthenticatedService'
import { projectService } from '../lib/supabase'
import { AuthGuard } from './AuthGuard'

const Projects = () => {
  const { isAuthenticated } = useAuth()
  const [projects, setProjects] = useState([])
  const { callService, loading, error } = useAuthenticatedService()

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects()
    }
  }, [isAuthenticated])

  const loadProjects = async () => {
    try {
      const projectsData = await callService(
        () => projectService.getProjects(),
        { requireAuth: true }
      )
      setProjects(projectsData)
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }

  const createProject = async (projectData) => {
    try {
      const newProject = await callService(
        () => projectService.createProject(projectData),
        { requireAuth: true }
      )
      setProjects(prev => [newProject, ...prev])
      return newProject
    } catch (err) {
      console.error('Failed to create project:', err)
      throw err
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button onClick={loadProjects} className="bg-blue-600 text-white px-4 py-2 rounded">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button 
          onClick={() => {/* Open create project modal */}}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Project
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <div key={project.id} className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
              <p className="text-gray-600 mb-4">{project.description}</p>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Funding: ${project.funding_needed?.toLocaleString()}</span>
                <span>{new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No projects yet. Create your first project!</p>
        </div>
      )}
    </div>
  )
}

// Export wrapped version
export const AuthenticatedProjects = () => (
  <AuthGuard>
    <Projects />
  </AuthGuard>
)