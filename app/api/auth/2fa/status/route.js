// app/api/auth/2fa/status/route.js
import { NextResponse } from 'next/server'
import { getSimpleAuth } from '../../../../lib/simpleAuthHelper.js'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { supabase, user, authMethod } = await getSimpleAuth(request)

    if (!user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: { authMethod, environment: 'vercel-production' }
      }, { status: 401 })
    }

    // Get user profile to check 2FA settings
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('two_factor_enabled, two_factor_secret')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching 2FA status:', profileError)
      return NextResponse.json({ 
        error: 'Failed to get 2FA status',
        debug: { authMethod, profileError: profileError.message }
      }, { status: 500 })
    }

    return NextResponse.json({
      enabled: profile?.two_factor_enabled || false,
      authMethod,
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