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

    console.log('🔍 Service role API: Getting angel investor for user:', userId)

    const { data: angelInvestor, error } = await supabaseAdmin
      .from('angel_investors')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Service role angel investor fetch error:', error)
      return Response.json({ 
        error: 'Failed to fetch angel investor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Service role API: Retrieved angel investor:`, angelInvestor?.id)
    
    return Response.json({ angelInvestor })
  } catch (error) {
    console.error('Service role angel investor GET error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { user_id, ...angelInvestorData } = data
    
    if (!user_id) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Creating angel investor for user:', user_id)

    // Add missing required fields
    const angelInvestorToCreate = {
      ...angelInvestorData,
      user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: angelInvestor, error } = await supabaseAdmin
      .from('angel_investors')
      .insert([angelInvestorToCreate])
      .select()
      .single()

    if (error) {
      console.error('Service role angel investor creation error:', error)
      return Response.json({ 
        error: 'Failed to create angel investor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Angel investor created successfully:', angelInvestor.id)
    
    return Response.json({ angelInvestor })
  } catch (error) {
    console.error('Service role angel investor POST error:', error)
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

    console.log('🚀 Service role API: Updating angel investor:', user_id)

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data: angelInvestor, error } = await supabaseAdmin
      .from('angel_investors')
      .update(updateData)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) {
      console.error('Service role angel investor update error:', error)
      return Response.json({ 
        error: 'Failed to update angel investor', 
        details: error.message 
      }, { status: 500 })
    }

    if (!angelInvestor) {
      return Response.json({ error: 'Angel investor not found' }, { status: 404 })
    }

    console.log('✅ Service role API: Angel investor updated successfully:', angelInvestor.id)
    
    return Response.json({ angelInvestor })
  } catch (error) {
    console.error('Service role angel investor PUT error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}