import { createClient } from '@supabase/supabase-js'

export async function GET(request, { params }) {
  try {
    // Use service role key for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const userId = params.userId
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get user profile from database
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)  // Fixed: was 'id', should be 'user_id'
      .maybeSingle()

    console.log('API /user/profile: userId:', userId)
    console.log('API /user/profile: profile found:', !!profile)
    console.log('API /user/profile: setup_completed:', profile?.setup_completed)

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error)
      return Response.json({ error: 'Database error' }, { status: 500 })
    }

    if (!profile) {
      return Response.json({ profile: null }, { 
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    return Response.json({ profile }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',  
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}