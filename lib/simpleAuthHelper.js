// lib/simpleAuthHelper.js
// Simple auth helper that works with Vercel - Simplified to match debug pattern exactly

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function getSimpleAuth(request = null) {
  try {
    // Primary method: Cookie-based auth (exact same pattern as working debug endpoint)
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    // Use the exact same calls as the debug endpoint
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // If we have a user from cookies (same as debug), return success
    if (user && !userError) {
      return {
        supabase,
        user,
        session,
        authMethod: 'cookie_auth'
      }
    }
    
    // Fallback: Bearer token auth
    if (request) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.replace('Bearer ', '')
          
          // Create bearer token client
          const bearerSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          )
          
          // Set the auth token
          const { data: { user: tokenUser }, error: tokenError } = await bearerSupabase.auth.getUser(token)
          
          if (tokenUser && !tokenError) {
            return {
              supabase: bearerSupabase,
              user: tokenUser,
              session: null,
              authMethod: 'bearer_token'
            }
          }
        } catch (bearerError) {
          console.log('Bearer auth failed:', bearerError.message)
        }
      }
    }
    
    // No authentication found
    return {
      supabase,
      user: null,
      session: null,
      authMethod: 'no_auth'
    }
    
  } catch (error) {
    console.error('Simple auth error:', error)
    return {
      supabase: null,
      user: null,
      session: null,
      authMethod: 'error',
      error: error.message
    }
  }
}