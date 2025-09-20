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

    // Get completed submissions (applications that have been submitted)
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'submitted') // Only completed/submitted ones
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Complete submissions fetch error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch complete submissions', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ submissions: data || [] })
  } catch (error: any) {
    console.error('Complete submissions API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}