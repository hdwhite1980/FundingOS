// app/api/auth/2fa/disable-new/route.js
// Alternative 2FA disable endpoint using service role authentication
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
          message: 'Frontend must provide authenticated user ID to disable 2FA',
          environment: 'vercel-production' 
        }
      }, { status: 400 })
    }

    const supabase = await getSupabaseServiceClient()

    // Get user profile to check if 2FA is enabled
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, two_factor_enabled')
      .eq('user_id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching user profile for 2FA disable:', profileError)
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

    // Disable 2FA and clear secrets
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error disabling 2FA:', updateError)
      return NextResponse.json({ 
        error: 'Failed to disable 2FA',
        debug: { updateError: updateError.message }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '2FA disabled successfully',
      user: { id: userId },
      authMethod: 'service_role_2fa_disable'
    })

  } catch (error) {
    console.error('2FA disable API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      debug: { error: error.message }
    }, { status: 500 })
  }
}