// Service role API endpoint for application/submission creation
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
    console.log('🔧 Application creation API endpoint called')
    
    // Get the request data
    const applicationData = await request.json()
    console.log('📝 Application data received:', applicationData)

    // Get user ID from the request (passed from frontend)
    const { user_id, ...applicationFields } = applicationData
    
    if (!user_id) {
      console.error('❌ No user_id provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Create service role client (bypasses RLS)
    const supabase = getSupabaseServiceClient()
    
    // Prepare application data with proper timestamps
    const newApplication = {
      ...applicationFields,
      user_id: user_id,
      status: applicationFields.status || 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('💾 Inserting application with service role')

    // Insert application using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('submissions')
      .insert([newApplication])
      .select()
      .single()

    if (error) {
      console.error('❌ Application creation error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create application', 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      )
    }

    console.log('✅ Application created successfully:', data.id)
    return NextResponse.json({ success: true, application: data })

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