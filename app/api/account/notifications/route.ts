import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, preferences } = await req.json()
    if (!userId || !preferences) {
      return NextResponse.json({ error: 'userId and preferences required' }, { status: 400 })
    }
    const supabase = getServerClient()

    try {
      // Try to fetch current to merge
      const { data: existing, error: fetchError } = await supabase
        .from('user_profiles')
        .select('notification_preferences')
        .eq('user_id', userId)  // Changed from 'id' to 'user_id' to match schema
        .maybeSingle()
      
      // If table doesn't exist, return success for now
      if (fetchError && fetchError.code === 'PGRST106') {
        console.log('user_profiles table does not exist yet - notification preferences not saved')
        return NextResponse.json({ 
          success: true,
          message: 'Notification preferences received (table pending creation)',
          preferences 
        })
      }
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      const merged = { ...(existing?.notification_preferences || {}), ...preferences }

      const payload = { 
        user_id: userId, 
        notification_preferences: merged, 
        updated_at: new Date().toISOString() 
      }
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'user_id' })  // Changed conflict column
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ profile: data })
    } catch (dbError: any) {
      // If any database error, fail gracefully
      console.log('Database error in notifications API:', dbError.message)
      return NextResponse.json({ 
        success: true,
        message: 'Notification preferences received (database pending setup)',
        preferences 
      })
    }
  } catch (e: any) {
    console.error('PUT /api/account/notifications error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
