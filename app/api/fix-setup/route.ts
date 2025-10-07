export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId } = body || {}
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const supabase = getServerClient()

    // Check current status
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('user_id, email, setup_completed, organization_name')
      .eq('user_id', userId)
      .single()

    console.log('Current profile before fix:', currentProfile)

    // Update setup_completed to true
    const { data: updatedProfile, error } = await supabase
      .from('user_profiles')
      .update({ 
        setup_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating setup_completed:', error)
      throw error
    }

    console.log('Profile after fix:', updatedProfile)

    return NextResponse.json({ 
      success: true,
      message: 'setup_completed flag updated to true',
      before: currentProfile,
      after: updatedProfile
    })
  } catch (e: any) {
    console.error('POST /api/fix-setup error:', e)
    return NextResponse.json({ error: 'Server error: ' + e.message }, { status: 500 })
  }
}
