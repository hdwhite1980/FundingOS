import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error && error.code !== 'PGRST116') throw error
    return NextResponse.json({ profile: data || null })
  } catch (e: any) {
    console.error('GET /api/account/profile error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, updates } = body || {}
    if (!userId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'userId and updates required' }, { status: 400 })
    }
    const supabase = getServerClient()

    const payload = { id: userId, ...updates, updated_at: new Date().toISOString() }
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ profile: data })
  } catch (e: any) {
    console.error('PUT /api/account/profile error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
