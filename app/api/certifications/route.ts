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

    // Try to get certifications - if table doesn't exist, return empty array
    try {
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist, return empty array instead of error
        console.warn('Certifications table may not exist:', error.message)
        return NextResponse.json({ certifications: [] })
      }

      return NextResponse.json({ certifications: data || [] })
    } catch (tableError) {
      // Table doesn't exist - return empty array
      console.warn('Certifications table not found, returning empty array')
      return NextResponse.json({ certifications: [] })
    }
  } catch (error: any) {
    console.error('Certifications API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, certification } = body || {}
    
    if (!userId || !certification) {
      return NextResponse.json({ error: 'userId and certification data required' }, { status: 400 })
    }

    const supabase = getSupabaseServiceClient()

    const { data, error } = await supabase
      .from('certifications')
      .insert([{ 
        user_id: userId,
        ...certification,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      }])
      .select()
      .single()

    if (error) {
      console.error('Certification creation error:', error)
      return NextResponse.json({ 
        error: 'Failed to create certification', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ certification: data })
  } catch (error: any) {
    console.error('Certifications POST error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}