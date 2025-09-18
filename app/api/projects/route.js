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

    console.log('🔍 Service role API: Getting projects for user:', userId)

    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Service role projects fetch error:', error)
      return Response.json({ 
        error: 'Failed to fetch projects', 
        details: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Service role API: Retrieved ${projects?.length || 0} projects`)
    
    return Response.json({ projects })
  } catch (error) {
    console.error('Service role projects GET error:', error)
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}