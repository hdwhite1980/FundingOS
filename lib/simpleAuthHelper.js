// lib/simpleAuthHelper.js
// Simple auth helper that works with Vercel - Fixed to match working debug endpoint

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function getSimpleAuth(request = null) {
  try {
    // Primary method: Cookie-based auth (same as working debug endpoint)
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    let authMethod = 'cookie_auth'
    let finalUser = user
    let finalSession = session
    
    // If cookie auth worked, use it
    if (user && !userError) {
      authMethod = 'cookie_success'
      return {
        supabase,
        user: finalUser,
        session: finalSession,
        authMethod
      }
    }
    
    // Fallback: Bearer token auth (only if cookie auth failed)
    if (!finalUser && request) {
      try {
        const authHeader = request.headers.get('authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '')
          
          // Create a new supabase client for Bearer token auth
          const { createClient } = await import('@supabase/supabase-js')
          const bearerSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            }
          )
          
          const { data: { user: tokenUser }, error: tokenError } = await bearerSupabase.auth.getUser()
          
          if (tokenUser && !tokenError) {
            finalUser = tokenUser
            authMethod = 'bearer_success'
            return {
              supabase: bearerSupabase,
              user: finalUser,
              session: null, // Bearer tokens don't have sessions
              authMethod
            }
          }
        }
      } catch (bearerError) {
        console.log('Bearer auth failed:', bearerError.message)
      }
    }
    
    // No auth worked
    return {
      supabase,
      user: null,
      session: null,
      authMethod: 'no_auth_found'
    }
    
  } catch (error) {
    console.error('Simple auth error:', error)
    return {
      supabase: null,
      user: null,
      session: null,
      authMethod: 'error'
    }
  }
}