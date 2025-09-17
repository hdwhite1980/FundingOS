// app/api/auth/2fa/status/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    // Use the same auth method as the working debug endpoint
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: { userError: userError?.message, environment: 'vercel-production' }
      }, { status: 401 })
    }

    // Get user profile to check 2FA settings
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled, two_factor_secret')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching 2FA status:', profileError)
      return NextResponse.json({ 
        error: 'Failed to get 2FA status',
        debug: { profileError: profileError.message }
      }, { status: 500 })
    }

    return NextResponse.json({
      enabled: profile?.two_factor_enabled || false,
      user: { id: user.id }
    })

  } catch (error) {
    console.error('2FA status API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { error: error.message }
    }, { status: 500 })
  }
}