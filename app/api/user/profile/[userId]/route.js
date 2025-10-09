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
    console.log('API /user/profile: Capacity fields:', {
      years_in_operation: profile?.years_in_operation,
      full_time_staff: profile?.full_time_staff,
      board_size: profile?.board_size,
      annual_budget: profile?.annual_budget
    })
    console.log('API /user/profile: Legal Foundation fields:', {
      tax_id: profile?.tax_id,
      date_incorporated: profile?.date_incorporated,
      state_incorporated: profile?.state_incorporated,
      duns_uei_number: profile?.duns_uei_number
    })

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