// Service role API endpoint for project opportunities creation
// This bypasses RLS issues by using service role authentication
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create service role client that bypasses RLS
const getSupabaseServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request) {
  try {
    console.log('🔧 Project opportunity creation API endpoint called')
    
    // Get the request data
    const opportunityData = await request.json()
    console.log('📝 Project opportunity data received')

    // Get user ID from the request (passed from frontend)
    const { user_id, ...opportunityFields } = opportunityData
    
    if (!user_id) {
      console.error('❌ No user_id provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Create service role client (bypasses RLS)
    const supabase = getSupabaseServiceClient()
    
    // Prepare opportunity data with proper timestamps
    const newOpportunity = {
      ...opportunityFields,
      user_id: user_id,
      created_at: new Date().toISOString()
    }

    console.log('💾 Inserting project opportunity with service role')

    // Insert opportunity using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('project_opportunities')
      .insert([newOpportunity])
      .select()
      .single()

    if (error) {
      console.error('❌ Project opportunity creation error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create project opportunity', 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      )
    }

    console.log('✅ Project opportunity created successfully:', data.id)
    return NextResponse.json({ success: true, projectOpportunity: data })

  } catch (error) {
    console.error('❌ API endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    console.log('🔧 Project opportunity update API endpoint called')
    
    // Get the request data
    const { id, updates, userId } = await request.json()
    
    if (!id || !userId) {
      console.error('❌ Missing id or userId')
      return NextResponse.json(
        { error: 'ID and User ID are required' },
        { status: 400 }
      )
    }

    // Create service role client (bypasses RLS)
    const supabase = getSupabaseServiceClient()

    // Update opportunity using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('project_opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Project opportunity update error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update project opportunity', 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      )
    }

    console.log('✅ Project opportunity updated successfully:', data.id)
    return NextResponse.json({ success: true, projectOpportunity: data })

  } catch (error) {
    console.error('❌ API endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}