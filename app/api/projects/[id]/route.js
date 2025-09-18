// Service role API endpoint for project updates
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

export async function PUT(request, { params }) {
  try {
    console.log('🔧 Project update API endpoint called')
    
    // Get the request data
    const { projectData, userId } = await request.json()
    const projectId = params.id
    
    console.log('📝 Updating project:', projectId, 'for user:', userId)

    if (!projectId || !userId) {
      console.error('❌ Missing projectId or userId')
      return NextResponse.json(
        { error: 'Project ID and User ID are required' },
        { status: 400 }
      )
    }

    // Create service role client (bypasses RLS)
    const supabase = getSupabaseServiceClient()
    
    // Prepare update data
    const updateData = {
      ...projectData,
      updated_at: new Date().toISOString()
    }

    console.log('💾 Updating project with service role')

    // Update project using service role (bypasses RLS)
    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ Project update error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update project', 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      )
    }

    console.log('✅ Project updated successfully:', data.id)
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