export const dynamic = 'force-dynamic'
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
      .maybeSingle()
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

    // Sanitize: convert empty strings to null and coerce numeric fields
    const numericFields = new Set([
      'annual_budget',
      'years_in_operation',
      'full_time_staff',
      'board_size',
      'largest_grant',
      'annual_revenue',
      'employee_count',
      'service_radius',
      // Additional fields from database schema
      'incorporation_year',
      'years_operating',
      'part_time_staff',
      'volunteers',
      'board_members',
      'indirect_cost_rate'
    ])

    const sanitizedUpdates: Record<string, any> = {}
    for (const [key, val] of Object.entries(updates)) {
      if (val === '') {
        sanitizedUpdates[key] = null
        continue
      }
      if (numericFields.has(key)) {
        if (val === null || val === undefined) {
          sanitizedUpdates[key] = null
        } else {
          const n = typeof val === 'string' ? Number(val) : Number(val as any)
          sanitizedUpdates[key] = Number.isFinite(n) ? n : null
        }
        continue
      }
      sanitizedUpdates[key] = val
    }

    const payload = { id: userId, ...sanitizedUpdates, updated_at: new Date().toISOString() }
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
