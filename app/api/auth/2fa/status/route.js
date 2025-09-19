// app/api/auth/2fa/status/route.js
import { NextResponse } from 'next/server'
import { getVercelAuth } from '@/lib/vercelAuthHelper.js'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const authResult = await getVercelAuth(request)

    if (!authResult.user) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        debug: { 
          authMethod: authResult.authMethod,
          error: authResult.error,
          environment: 'vercel-production' 
        }
      }, { status: 401 })
    }

    // Get user profile to check 2FA settings
    const { data: profile, error: profileError } = await authResult.supabase
      .from('profiles')
      .select('two_factor_enabled, two_factor_secret')
      .eq('user_id', authResult.user.id)
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
      user: { id: authResult.user.id },
      authMethod: authResult.authMethod
    })

  } catch (error) {
    console.error('2FA status API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { error: error.message }
    }, { status: 500 })
  }
}