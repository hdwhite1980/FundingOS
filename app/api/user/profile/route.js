import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return Response.json({ error: 'No session found' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // First try to get existing profile
    const { data: existingProfile, error: getError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (existingProfile) {
      return Response.json({ profile: existingProfile })
    }

    // If no profile exists, create one
    if (getError && getError.code === 'PGRST116') {
      const newProfile = {
        id: userId,
        email: userEmail,
        full_name: '',
        organization_name: '',
        organization_type: 'nonprofit',
        user_role: session.user.user_metadata?.user_role || 'company',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single()

      if (createError) {
        console.error('Failed to create profile:', createError)
        return Response.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      return Response.json({ profile: createdProfile })
    }

    console.error('Profile fetch error:', getError)
    return Response.json({ error: 'Failed to fetch profile' }, { status: 500 })
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return Response.json({ error: 'No session found' }, { status: 401 })
    }

    const userId = session.user.id
    const updates = await request.json()

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return Response.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return Response.json({ profile: data })
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}