// utils/serviceWrapper.js
import { supabase, authHelpers } from '../lib/supabase'

export class ServiceError extends Error {
  constructor(message, code, originalError = null) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.originalError = originalError
  }
}

export const serviceWrapper = {
  async execute(serviceFunction, options = {}) {
    const {
      requireAuth = true,
      fallbackValue = null,
      retryAttempts = 1,
      retryDelay = 1000,
      errorMessage = 'Service operation failed'
    } = options

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        if (requireAuth) {
          const session = await authHelpers.getCurrentSession()
          if (!session?.user) {
            throw new ServiceError(
              'Authentication required. Please log in.',
              'AUTH_REQUIRED'
            )
          }
        }

        return await serviceFunction()
      } catch (error) {
        console.error(`${errorMessage} (attempt ${attempt + 1}/${retryAttempts}):`, error)

        // Don't retry auth errors
        if (error.code === 'AUTH_REQUIRED' || error.message?.includes('Authentication required')) {
          throw error
        }

        // Don't retry on final attempt
        if (attempt === retryAttempts - 1) {
          if (fallbackValue !== null) {
            console.warn('Returning fallback value due to service error')
            return fallbackValue
          }
          throw new ServiceError(errorMessage, 'SERVICE_ERROR', error)
        }

        // Wait before retry
        if (retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
  }
}

// Enhanced service wrapper for React components
export const useServiceCall = (dependencies = []) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const callService = useCallback(async (serviceFunction, options = {}) => {
    setLoading(true)
    setError(null)

    try {
      const result = await serviceWrapper.execute(serviceFunction, options)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, dependencies)

  return { callService, loading, error }
}

// Safe profile loader that handles missing profiles gracefully
export const safeProfileLoader = {
  async getOrCreateProfile(profileData = {}) {
    try {
      const session = await authHelpers.ensureAuthenticated()
      
      // Try to get existing profile
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()

      if (existingProfile) {
        return existingProfile
      }

      // Create profile if it doesn't exist
      const defaultProfile = {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || '',
        organization_name: '',
        organization_type: 'nonprofit',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...profileData
      }

      const { data: newProfile, error } = await supabase
        .from('user_profiles')
        .insert([defaultProfile])
        .select()
        .single()

      if (error) {
        throw new ServiceError('Failed to create user profile', 'PROFILE_CREATION_ERROR', error)
      }

      return newProfile
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error
      }
      throw new ServiceError('Failed to load or create profile', 'PROFILE_ERROR', error)
    }
  }
}

// Component wrapper for handling service loading states
export const ServiceLoader = ({ 
  children, 
  loading, 
  error, 
  fallback = null,
  errorFallback = null 
}) => {
  if (loading) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isAuthError = error.code === 'AUTH_REQUIRED' || 
                       error.message?.includes('Authentication required')
    
    if (isAuthError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-600 mb-4">
              Please log in to access this content.
            </p>
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

    return errorFallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  return children
}