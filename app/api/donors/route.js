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

    console.log('🔍 Service role API: Getting donors for user:', userId)

    const { data: donors, error } = await supabaseAdmin
      .from('donors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Service role donors fetch error:', error)
      return Response.json({ 
        error: 'Failed to fetch donors', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Service role API: Retrieved ${donors?.length || 0} donors`)
    
    return Response.json({ donors })
  } catch (error) {
    console.error('Service role donors GET error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { user_id, ...donorData } = data
    
    if (!user_id) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Creating donor for user:', user_id)

    // Add missing required fields
    const donorToCreate = {
      ...donorData,
      user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: donor, error } = await supabaseAdmin
      .from('donors')
      .insert([donorToCreate])
      .select()
      .single()

    if (error) {
      console.error('Service role donor creation error:', error)
      return Response.json({ 
        error: 'Failed to create donor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Donor created successfully:', donor.id)
    
    return Response.json({ donor })
  } catch (error) {
    console.error('Service role donor POST error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const data = await request.json()
    const { id, updates, userId } = data
    
    if (!id || !userId) {
      return Response.json({ error: 'Donor ID and User ID are required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Updating donor:', id)

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data: donor, error } = await supabaseAdmin
      .from('donors')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only update their own donors
      .select()
      .single()

    if (error) {
      console.error('Service role donor update error:', error)
      return Response.json({ 
        error: 'Failed to update donor', 
        details: error.message 
      }, { status: 500 })
    }

    if (!donor) {
      return Response.json({ error: 'Donor not found or access denied' }, { status: 404 })
    }

    console.log('✅ Service role API: Donor updated successfully:', donor.id)
    
    return Response.json({ donor })
  } catch (error) {
    console.error('Service role donor PUT error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')
    
    if (!id || !userId) {
      return Response.json({ error: 'Donor ID and User ID are required' }, { status: 400 })
    }

    console.log('🗑️ Service role API: Deleting donor:', id)

    const { error } = await supabaseAdmin
      .from('donors')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only delete their own donors

    if (error) {
      console.error('Service role donor deletion error:', error)
      return Response.json({ 
        error: 'Failed to delete donor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Donor deleted successfully:', id)
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Service role donor DELETE error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}