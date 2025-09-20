import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getSupabaseServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing')
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('User settings fetch error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch user settings', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ userSettings: data || {} })
  } catch (error: any) {
    console.error('User settings API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, updates } = body || {}
    
    if (!userId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'userId and updates required' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    // Check if user settings exist
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('user_settings')
        .update({ 
          ...updates, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json({ userSettings: data })
    } else {
      // Create new
      const { data, error } = await supabase
        .from('user_settings')
        .insert({ 
          user_id: userId,
          ...updates, 
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .select()
        .single()
      
      if (error) throw error
      return NextResponse.json({ userSettings: data })
    }
  } catch (error: any) {
    console.error('User settings PUT error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}