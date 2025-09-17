// app/api/auth/2fa/status/route.js
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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