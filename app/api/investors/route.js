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

    console.log('🔍 Service role API: Getting investors for user:', userId)

    const { data: investors, error } = await supabaseAdmin
      .from('investors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Service role investors fetch error:', error)
      return Response.json({ 
        error: 'Failed to fetch investors', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Service role API: Retrieved ${investors?.length || 0} investors`)
    
    return Response.json({ investors })
  } catch (error) {
    console.error('Service role investors GET error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { user_id, ...investorData } = data
    
    if (!user_id) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Creating investor for user:', user_id)

    // Add missing required fields
    const investorToCreate = {
      ...investorData,
      user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: investor, error } = await supabaseAdmin
      .from('investors')
      .insert([investorToCreate])
      .select()
      .single()

    if (error) {
      console.error('Service role investor creation error:', error)
      return Response.json({ 
        error: 'Failed to create investor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Investor created successfully:', investor.id)
    
    return Response.json({ investor })
  } catch (error) {
    console.error('Service role investor POST error:', error)
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
      return Response.json({ error: 'Investor ID and User ID are required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Updating investor:', id)

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data: investor, error } = await supabaseAdmin
      .from('investors')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only update their own investors
      .select()
      .single()

    if (error) {
      console.error('Service role investor update error:', error)
      return Response.json({ 
        error: 'Failed to update investor', 
        details: error.message 
      }, { status: 500 })
    }

    if (!investor) {
      return Response.json({ error: 'Investor not found or access denied' }, { status: 404 })
    }

    console.log('✅ Service role API: Investor updated successfully:', investor.id)
    
    return Response.json({ investor })
  } catch (error) {
    console.error('Service role investor PUT error:', error)
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
      return Response.json({ error: 'Investor ID and User ID are required' }, { status: 400 })
    }

    console.log('🗑️ Service role API: Deleting investor:', id)

    const { error } = await supabaseAdmin
      .from('investors')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only delete their own investors

    if (error) {
      console.error('Service role investor deletion error:', error)
      return Response.json({ 
        error: 'Failed to delete investor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Investor deleted successfully:', id)
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Service role investor DELETE error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}