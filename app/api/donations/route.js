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

    console.log('🔍 Service role API: Getting donations for user:', userId)

    const { data: donations, error } = await supabaseAdmin
      .from('donations')
      .select(`
        *,
        donor:donors(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Service role donations fetch error:', error)
      return Response.json({ 
        error: 'Failed to fetch donations', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Service role API: Retrieved ${donations?.length || 0} donations`)
    
    return Response.json({ donations })
  } catch (error) {
    console.error('Service role donations GET error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { user_id, ...donationData } = data
    
    if (!user_id) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Creating donation for user:', user_id)

    // Add missing required fields
    const donationToCreate = {
      ...donationData,
      user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: donation, error } = await supabaseAdmin
      .from('donations')
      .insert([donationToCreate])
      .select()
      .single()

    if (error) {
      console.error('Service role donation creation error:', error)
      return Response.json({ 
        error: 'Failed to create donation', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Donation created successfully:', donation.id)
    
    return Response.json({ donation })
  } catch (error) {
    console.error('Service role donation POST error:', error)
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
      return Response.json({ error: 'Donation ID and User ID are required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Updating donation:', id)

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data: donation, error } = await supabaseAdmin
      .from('donations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only update their own donations
      .select()
      .single()

    if (error) {
      console.error('Service role donation update error:', error)
      return Response.json({ 
        error: 'Failed to update donation', 
        details: error.message 
      }, { status: 500 })
    }

    if (!donation) {
      return Response.json({ error: 'Donation not found or access denied' }, { status: 404 })
    }

    console.log('✅ Service role API: Donation updated successfully:', donation.id)
    
    return Response.json({ donation })
  } catch (error) {
    console.error('Service role donation PUT error:', error)
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
      return Response.json({ error: 'Donation ID and User ID are required' }, { status: 400 })
    }

    console.log('🗑️ Service role API: Deleting donation:', id)

    const { error } = await supabaseAdmin
      .from('donations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only delete their own donations

    if (error) {
      console.error('Service role donation deletion error:', error)
      return Response.json({ 
        error: 'Failed to delete donation', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Donation deleted successfully:', id)
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Service role donation DELETE error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}