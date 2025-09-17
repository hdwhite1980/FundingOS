// app/api/auth/user-status/route.js
// Alternative endpoint that accepts user ID from authenticated frontend
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID required',
        debug: { 
          message: 'Frontend must provide authenticated user ID',
          environment: 'vercel-production' 
        }
      }, { status: 400 })
    }

    const supabase = await getSupabaseServiceClient()

    // Get user profile and security settings using service role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, two_factor_enabled, two_factor_secret')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ 
        error: 'Failed to get user profile',
        debug: { profileError: profileError.message }
      }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ 
        error: 'User profile not found',
        debug: { userId }
      }, { status: 404 })
    }

    // Get user sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('session_id, device_info, created_at, last_accessed')
      .eq('user_id', userId)
      .order('last_accessed', { ascending: false })

    // Get user devices
    const { data: devices, error: devicesError } = await supabase
      .from('user_devices')
      .select('device_id, device_name, device_type, trusted, created_at, last_used')
      .eq('user_id', userId)
      .order('last_used', { ascending: false })

    return NextResponse.json({
      user: { id: userId },
      twoFactor: {
        enabled: profile.two_factor_enabled || false,
        configured: !!(profile.two_factor_secret)
      },
      sessions: sessions || [],
      devices: devices || [],
      authMethod: 'service_role_with_userid'
    })

  } catch (error) {
    console.error('User status API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { error: error.message }
    }, { status: 500 })
  }
}