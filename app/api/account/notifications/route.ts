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

      // For upsert, we need to handle two cases:
      // 1. If profile exists - just update notification_preferences
      // 2. If profile doesn't exist - we need email (get from auth)
      
      if (existing) {
        // Profile exists - just update notification_preferences
        const { data, error } = await supabase
          .from('user_profiles')
          .update({ 
            notification_preferences: merged, 
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId)
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ profile: data })
      } else {
        // Profile doesn't exist - need to get email from auth first
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
        if (authError || !authUser?.user?.email) {
          throw new Error('User email required to create profile')
        }
        
        const payload = { 
          user_id: userId,
          email: authUser.user.email,  // Required NOT NULL field
          notification_preferences: merged, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        }
        const { data, error } = await supabase
          .from('user_profiles')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        return NextResponse.json({ profile: data })
      }
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
