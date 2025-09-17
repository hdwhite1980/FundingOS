export const dynamic = 'force-dynamic'
// app/api/auth/2fa/status/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Debug: Check session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('2FA API - Session check:', { hasSession: !!session, sessionError })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('2FA API - User check:', { hasUser: !!user, userError })

    if (!user) {
      console.log('2FA API - No user found, returning 401')
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: { hasSession: !!session, hasUser: !!user }
      }, { status: 401 })
    }

    console.log('2FA API - User authenticated:', user.id)

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