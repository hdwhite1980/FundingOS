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
    
    console.log('API: Raw Supabase data:', JSON.stringify(data, null, 2))
    console.log('API: setup_completed value:', data?.setup_completed)
    console.log('API: setup_completed type:', typeof data?.setup_completed)
    
    if (error && error.code !== 'PGRST116') throw error
    
    // If no profile exists, create a minimal one with user's email
    if (!data) {
      console.log('API: No profile found, creating minimal profile')
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
      
      console.log('API: Creating minimal profile:', minimalProfile)
      
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert(minimalProfile)
        .select()
        .single()
        
      if (insertError) {
        console.error('Failed to create minimal profile:', insertError)
        return NextResponse.json({ profile: null })
      }
      
      console.log('API: Created new minimal profile:', newProfile)
      return NextResponse.json({ profile: newProfile })
    }
    
    console.log('API: Returning existing profile with setup_completed:', data.setup_completed)
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
    
    console.log('📨 Received profile update request')
    console.log('🔑 Fields in updates:', Object.keys(updates || {}))
    console.log('📋 Legal Foundation received:', {
      tax_id: updates?.tax_id,
      date_incorporated: updates?.date_incorporated,
      state_incorporated: updates?.state_incorporated,
      duns_uei_number: updates?.duns_uei_number
    })
    
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
      console.log('🔄 Updating user_profiles with:', Object.keys(sanitizedUpdates))
      console.log('📋 Legal Foundation fields:', {
        tax_id: sanitizedUpdates.tax_id,
        date_incorporated: sanitizedUpdates.date_incorporated,
        state_incorporated: sanitizedUpdates.state_incorporated,
        duns_uei_number: sanitizedUpdates.duns_uei_number
      })
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ 
          ...sanitizedUpdates, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Update error:', error)
        throw error
      }
      
      console.log('✅ Profile updated successfully - ALL FIELDS:', Object.keys(data || {}))
      console.log('✅ Sample fields from response:', {
        tax_id: data.tax_id,
        organization_name: data.organization_name,
        city: data.city,
        years_in_operation: data.years_in_operation,
        full_time_staff: data.full_time_staff
      })

      // ALSO save organization-specific data to company_settings table
      const companyFields: Record<string, any> = {
        user_id: userId,
        updated_at: new Date().toISOString()
      }
      
      // Extract organization fields that exist in company_settings
      const orgFieldMap: Record<string, string> = {
        'organization_name': 'organization_name',
        'organization_id': 'organization_id',
        'ein': 'ein',
        'tax_id': 'tax_id',
        'duns_number': 'duns_number',
        'cage_code': 'cage_code',
        'organization_type': 'organization_type',
        'address_line1': 'address_line1',
        'address_line2': 'address_line2',
        'city': 'city',
        'state': 'state',
        'zip_code': 'zip_code',
        'country': 'country',
        'phone': 'phone',
        'website': 'website',
        'contact_person': 'contact_person',
        'contact_title': 'contact_title',
        'contact_email': 'contact_email'
      }
      
      for (const [key, companyKey] of Object.entries(orgFieldMap)) {
        if (key in sanitizedUpdates) {
          companyFields[companyKey] = sanitizedUpdates[key]
        }
      }
      
      // Only update company_settings if we have organization data
      if (Object.keys(companyFields).length > 2) { // More than just user_id and updated_at
        try {
          await supabase
            .from('company_settings')
            .upsert(companyFields, { 
              onConflict: 'user_id',
              ignoreDuplicates: false 
            })
          console.log('✅ Updated company_settings with organization data')
        } catch (companyError) {
          console.warn('⚠️ Failed to update company_settings (non-critical):', companyError)
          // Don't fail the main update if company_settings fails
        }
      }

      // Smart cache invalidation - only invalidate if significant changes
      try {
        const scoringCache = await import('../../../../lib/scoringCache.js')
        await scoringCache.default.smartInvalidateOnProfileUpdate(userId, currentProfile, data)
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

      // ALSO save organization-specific data to company_settings table
      const companyFields: Record<string, any> = {
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Extract organization fields that exist in company_settings
      const orgFieldMap: Record<string, string> = {
        'organization_name': 'organization_name',
        'organization_id': 'organization_id',
        'ein': 'ein',
        'tax_id': 'tax_id',
        'duns_number': 'duns_number',
        'cage_code': 'cage_code',
        'organization_type': 'organization_type',
        'address_line1': 'address_line1',
        'address_line2': 'address_line2',
        'city': 'city',
        'state': 'state',
        'zip_code': 'zip_code',
        'country': 'country',
        'phone': 'phone',
        'website': 'website',
        'contact_person': 'contact_person',
        'contact_title': 'contact_title',
        'contact_email': 'contact_email'
      }
      
      for (const [key, companyKey] of Object.entries(orgFieldMap)) {
        if (key in sanitizedUpdates) {
          companyFields[companyKey] = sanitizedUpdates[key]
        }
      }
      
      // Only create company_settings if we have organization data
      if (Object.keys(companyFields).length > 3) { // More than just user_id, created_at, updated_at
        try {
          await supabase
            .from('company_settings')
            .insert(companyFields)
          console.log('✅ Created company_settings with organization data')
        } catch (companyError) {
          console.warn('⚠️ Failed to create company_settings (non-critical):', companyError)
          // Don't fail the main insert if company_settings fails
        }
      }

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
