// lib/vercelAuthHelper.js
// Standardized Supabase auth handling for Vercel production

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Creates authenticated Supabase client that works on Vercel production
 * @param {Request} request - The incoming request object
 * @returns {Promise<{supabase: Object, user: Object|null, authMethod: string}>}
 */
export async function createAuthenticatedSupabaseClient(request = null) {
  try {
    // VERCEL PRODUCTION FIX: Explicit cookie handling
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    let user = null
    let authMethod = 'none'
    let debugInfo = {}
    
    // Method 1: getSession() first (often works better on Vercel)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    debugInfo.session = { hasSession: !!session, error: sessionError?.message }
    
    if (session?.user) {
      user = session.user
      authMethod = 'getSession'
    }
    
    // Method 2: getUser() fallback
    if (!user) {
      const { data: { user: user1 }, error: userError1 } = await supabase.auth.getUser()
      debugInfo.getUser = { hasUser: !!user1, error: userError1?.message }
      
      if (user1) {
        user = user1
        authMethod = 'getUser'
      }
    }
    
    // Method 3: Try Authorization header for API calls (if request provided)
    if (!user && request) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7)
          const { data: { user: user3 }, error: bearerError } = await supabase.auth.getUser(token)
          debugInfo.bearer = { hasUser: !!user3, error: bearerError?.message }
          
          if (user3) {
            user = user3
            authMethod = 'bearer'
          }
        } catch (e) {
          debugInfo.bearer = { error: e.message }
        }
      }
    }
    
    return {
      supabase,
      user,
      authMethod,
      debugInfo,
      isAuthenticated: !!user
    }
    
  } catch (error) {
    console.error('Auth helper error:', error)
    throw error
  }
}

/**
 * Returns standardized unauthorized response
 */
export function createUnauthorizedResponse(debugInfo = {}) {
  return NextResponse.json({ 
    error: 'Unauthorized',
    debug: { 
      environment: 'vercel-production',
      timestamp: new Date().toISOString(),
      ...debugInfo
    }
  }, { status: 401 })
}