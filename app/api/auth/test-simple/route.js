// Simple test endpoint to verify deployment
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    console.log('Test-simple endpoint called')
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('Test-simple: User result:', { user: !!user, error: userError?.message })
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      auth: {
        user_exists: !!user,
        user_id: user?.id,
        error: userError?.message
      },
      message: 'Simple test endpoint working'
    })
    
  } catch (error) {
    console.error('Test-simple error:', error)
    return NextResponse.json({ 
      error: 'Test endpoint failed',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}