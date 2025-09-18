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

    console.log('🔍 Service role API: Getting campaigns for user:', userId)

    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Service role campaigns fetch error:', error)
      return Response.json({ 
        error: 'Failed to fetch campaigns', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Service role API: Retrieved ${campaigns?.length || 0} campaigns`)
    
    return Response.json({ campaigns })
  } catch (error) {
    console.error('Service role campaigns GET error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const data = await request.json()
    const { user_id, ...campaignData } = data
    
    if (!user_id) {
      return Response.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Creating campaign for user:', user_id)

    // Add missing required fields
    const campaignToCreate = {
      ...campaignData,
      user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .insert([campaignToCreate])
      .select()
      .single()

    if (error) {
      console.error('Service role campaign creation error:', error)
      return Response.json({ 
        error: 'Failed to create campaign', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Campaign created successfully:', campaign.id)
    
    return Response.json({ campaign })
  } catch (error) {
    console.error('Service role campaign POST error:', error)
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
      return Response.json({ error: 'Campaign ID and User ID are required' }, { status: 400 })
    }

    console.log('🚀 Service role API: Updating campaign:', id)

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only update their own campaigns
      .select()
      .single()

    if (error) {
      console.error('Service role campaign update error:', error)
      return Response.json({ 
        error: 'Failed to update campaign', 
        details: error.message 
      }, { status: 500 })
    }

    if (!campaign) {
      return Response.json({ error: 'Campaign not found or access denied' }, { status: 404 })
    }

    console.log('✅ Service role API: Campaign updated successfully:', campaign.id)
    
    return Response.json({ campaign })
  } catch (error) {
    console.error('Service role campaign PUT error:', error)
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
      return Response.json({ error: 'Campaign ID and User ID are required' }, { status: 400 })
    }

    console.log('🗑️ Service role API: Deleting campaign:', id)

    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('user_id', userId) // Ensure user can only delete their own campaigns

    if (error) {
      console.error('Service role campaign deletion error:', error)
      return Response.json({ 
        error: 'Failed to delete campaign', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Service role API: Campaign deleted successfully:', id)
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('Service role campaign DELETE error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}