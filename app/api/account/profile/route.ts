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
      .eq('user_id', userId)  // Changed from 'id' to 'user_id'
      .maybeSingle()
    
    if (error && error.code !== 'PGRST116') throw error
    
    // If no profile exists, create a minimal one with user's email
    if (!data) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
      if (authError || !authUser?.user?.email) {
        return NextResponse.json({ profile: null })
      }
      
      // Create minimal profile with required email field (DO NOT include 'id', let it auto-generate)
      const minimalProfile = {
        user_id: userId,
        email: authUser.user.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert(minimalProfile)
        .select()
        .single()
        
      if (insertError) {
        console.error('Failed to create minimal profile:', insertError)
        return NextResponse.json({ profile: null })
      }
      
      return NextResponse.json({ profile: newProfile })
    }
    
    return NextResponse.json({ profile: data })
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

    // Get user email from auth system to ensure NOT NULL constraint is satisfied
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    if (authError || !authUser?.user?.email) {
      console.error('Failed to get user email:', authError)
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }

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

    // Check if profile exists first
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    // Get current profile data for comparison
    let currentProfile = null
    try {
      const { data: currentData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      currentProfile = currentData
    } catch (error) {
      console.warn('Could not fetch current profile for comparison:', error)
    }

    if (existingProfile) {
      // Profile exists - update it
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ 
          ...sanitizedUpdates, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) throw error

      // Smart cache invalidation - only invalidate if significant changes
      try {
        const { default: scoringCache } = await import('../../../../lib/scoringCache.js')
        await scoringCache.smartInvalidateOnProfileUpdate(userId, currentProfile, data)
      } catch (cacheError) {
        console.warn('⚠️ Cache invalidation failed (non-critical):', cacheError.message)
        // Don't fail the update if cache invalidation fails
      }

      return NextResponse.json({ profile: data })
    } else {
      // Profile doesn't exist - create it (DO NOT include 'id' field, let it auto-generate)
      const payload = { 
        user_id: userId,
        email: authUser.user.email,
        ...sanitizedUpdates, 
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      }
      
      const { data, error } = await supabase
        .from('user_profiles')
        .insert(payload)
        .select()
        .single()
      
      if (error) throw error

      // For new profiles, no need to invalidate since there shouldn't be cached scores yet
      // But invalidate anyway to be safe
      try {
        const { default: scoringCache } = await import('../../../../lib/scoringCache.js')
        await scoringCache.invalidateUserScores(userId)
      } catch (cacheError) {
        console.warn('⚠️ Cache invalidation failed (non-critical):', cacheError.message)
      }

      return NextResponse.json({ profile: data })
    }
  } catch (e: any) {
    console.error('PUT /api/account/profile error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
