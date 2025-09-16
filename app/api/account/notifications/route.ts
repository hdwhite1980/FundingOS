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

    // Fetch current to merge
    const { data: existing, error: fetchError } = await supabase
      .from('user_profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .maybeSingle()
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    const merged = { ...(existing?.notification_preferences || {}), ...preferences }

    const payload = { id: userId, notification_preferences: merged, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ profile: data })
  } catch (e: any) {
    console.error('PUT /api/account/notifications error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
