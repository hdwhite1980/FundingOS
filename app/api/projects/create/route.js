// Service role API endpoint for project creation
// This bypasses RLS issues by using service role authentication
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create service role client that bypasses RLS
const getSupabaseServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key bypasses RLS
  )
}

export async function POST(request) {
  try {
    console.log('🔧 Project creation API endpoint called')
    
    // Get the request data
    const projectData = await request.json()
    console.log('📝 Project data received:', projectData)

    // Get user ID from the request (passed from frontend)
    const { user_id, ...projectFields } = projectData
    
    if (!user_id) {
      console.error('❌ No user_id provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Create service role client (bypasses RLS)
    const supabase = getSupabaseServiceClient()
    
    // Prepare project data with proper timestamps
    const newProject = {
      ...projectFields,
      user_id: user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('💾 Inserting project with service role:', {
      user_id: newProject.user_id,
      name: newProject.name,
      fieldCount: Object.keys(newProject).length
    })

    // Insert project using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('projects')
      .insert([newProject])
      .select()
      .single()

    if (error) {
      console.error('❌ Project creation error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create project', 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      )
    }

    console.log('✅ Project created successfully:', data.id)
    return NextResponse.json({ success: true, project: data })

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