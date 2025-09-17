// lib/simpleAuthHelper.js
// Simple auth helper that works with Vercel

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function getSimpleAuth(request = null) {
  try {
    // Cookie-based auth
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    let authMethod = 'none_worked'
    let finalUser = user
    
    if (user && !userError) {
      authMethod = 'cookie_v2'
    }
    
    // Bearer token fallback
    if (!finalUser && request) {
      try {
        const authHeader = request.headers.get('authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '')
          const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
          
          if (tokenUser && !tokenError) {
            finalUser = tokenUser
            authMethod = 'bearer_token'
          }
        }
      } catch (bearerError) {
        console.log('Bearer auth failed:', bearerError.message)
      }
    }
    
    return {
      supabase,
      user: finalUser,
      session,
      authMethod
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