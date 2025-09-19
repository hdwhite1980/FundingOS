import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Service role client for operations that need to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🔍 Service role API: Getting user profile for user:', userId)

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Service role user profile fetch error:', error)
      return Response.json({ 
        error: 'Failed to fetch user profile', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Service role API: Retrieved user profile:`, profile?.id)
    
    return Response.json({ profile })
  } catch (error) {
    console.error('Service role user profile GET error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { user_id, ...profileData } = data
    
    if (!user_id) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Creating/updating user profile for user:', user_id)

    // Add missing required fields
    const profileToUpsert = {
      ...profileData,
      user_id,
      updated_at: new Date().toISOString(),
      // Only set created_at if it doesn't exist
      ...(profileData.created_at ? {} : { created_at: new Date().toISOString() })
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .upsert(profileToUpsert, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      console.error('Service role user profile upsert error:', error)
      return Response.json({ 
        error: 'Failed to create/update user profile', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: User profile created/updated successfully:', profile.user_id)
    
    return Response.json({ profile })
  } catch (error) {
    console.error('Service role user profile POST error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()
    const { user_id, updates } = data
    
    if (!user_id) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Updating user profile:', user_id)

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) {
      console.error('Service role user profile update error:', error)
      return Response.json({ 
        error: 'Failed to update user profile', 
        details: error.message 
      }, { status: 500 })
    }

    if (!profile) {
      return Response.json({ error: 'User profile not found' }, { status: 404 })
    }

    console.log('✅ Service role API: User profile updated successfully:', profile.user_id)
    
    return Response.json({ profile })
  } catch (error) {
    console.error('Service role user profile PUT error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}