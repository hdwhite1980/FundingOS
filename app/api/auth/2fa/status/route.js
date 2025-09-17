export const dynamic = 'force-dynamic'
// app/api/auth/2fa/status/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    // VERCEL PRODUCTION FIX: Create client with explicit cookie handling
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    // Try multiple auth methods for Vercel compatibility
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
    
    // Method 3: Try Authorization header for API calls
    if (!user) {
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
    
    console.log('🔐 2FA API Auth Debug (Vercel):', { 
      hasUser: !!user, 
      userId: user?.id,
      authMethod,
      environment: 'vercel-production',
      debugInfo
    })

    if (!user) {
      console.log('❌ 2FA API - No user found with any auth method')
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: { 
          authMethod: 'none_worked',
          environment: 'vercel-production',
          debugInfo
        }
      }, { status: 401 })
    }

    console.log('✅ 2FA API - User authenticated via:', authMethod, user.id)

    // Check if user has 2FA enabled in their profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled')
      .eq('id', user.id)
      .single()

    if (error) {
      // Check if this is a schema error (2FA columns don't exist yet)
      if (error.message?.includes('two_factor') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('column')) {
        console.log('2FA columns not ready yet - this is expected during database setup')
        return NextResponse.json({ 
          enabled: false,
          message: '2FA feature not yet configured' 
        })
      }
      
      console.error('Error checking 2FA status:', error)
      return NextResponse.json({ error: 'Failed to check 2FA status' }, { status: 500 })
    }

    return NextResponse.json({ 
      enabled: profile?.two_factor_enabled || false 
    })

  } catch (error) {
    console.error('2FA status API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}