// Service role API endpoint for project creation
// This bypasses RLS issues by using service role authentication
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request) {
  try {
    console.log('🔧 Project creation API endpoint called')
    
    // Get the request data
    const projectData = await request.json()
    console.log('📝 Project data received:', projectData)

    // Get user ID from the request (passed from frontend)
    const { user_id, ...projectFields } = projectData
    console.log('🔍 Raw project fields:', projectFields)
    
    if (!user_id) {
      console.error('❌ No user_id provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Create service role client (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Define all known date fields to ensure proper handling
    const dateFields = [
      'proposed_start_date', 'funding_decision_needed', 'latest_useful_start', 
      'investment_deadline', 'start_date', 'end_date', 'deadline_date', 'created_at', 'updated_at'
    ]
    
    // Clean up empty strings to null for date fields and numeric fields
    const cleanedFields = {}
    for (const [key, value] of Object.entries(projectFields)) {
      // Convert empty strings to null for date fields (comprehensive check)
      if (dateFields.includes(key) || key.includes('date') || key.includes('_at') || key.includes('deadline') || key.endsWith('_date')) {
        cleanedFields[key] = (value === '' || value === null || value === undefined) ? null : value
        if (value === '') {
          console.log(`🧹 Cleaned empty date field: ${key} (was empty string)`)
        }
      }
      // Convert empty strings to null for numeric fields
      else if (key.includes('funding') || key.includes('jobs') || key.includes('amount') || key.includes('budget') || key.includes('cost') || key.includes('percentage')) {
        const numericValue = (value === '' || value === null || value === undefined) ? null : (value ? parseFloat(value) : null)
        cleanedFields[key] = numericValue
        if (value === '') {
          console.log(`🧹 Cleaned empty numeric field: ${key} (was empty string)`)
        }
      }
      // Keep other fields as is, but convert empty strings to null if they're optional
      else {
        const requiredFields = ['name', 'description', 'location', 'project_type', 'project_category']
        cleanedFields[key] = value === '' && !requiredFields.includes(key) ? null : value
        if (value === '' && !requiredFields.includes(key)) {
          console.log(`🧹 Cleaned empty optional field: ${key} (was empty string)`)
        }
      }
    }
    
    console.log('✨ Cleaned project fields count:', Object.keys(cleanedFields).length)
    console.log('🔍 Date fields processed:', Object.keys(cleanedFields).filter(k => 
      dateFields.includes(k) || k.includes('date') || k.includes('_at') || k.includes('deadline')
    ))

    // Prepare project data with proper timestamps
    const newProject = {
      ...cleanedFields,
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