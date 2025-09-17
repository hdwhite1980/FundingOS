// Simple auth debug endpoint to check what cookies/auth data Vercel sees
// app/api/auth/debug/route.js

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore
    })
    
    // Get all cookies to see what Vercel has access to
    const allCookies = {}
    cookieStore.getAll().forEach(cookie => {
      allCookies[cookie.name] = cookie.value?.substring(0, 20) + '...' // Truncate for security
    })
    
    // Try auth methods
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    const debugInfo = {
      environment: 'vercel-production',
      timestamp: new Date().toISOString(),
      headers: {
        'user-agent': request.headers.get('user-agent'),
        'origin': request.headers.get('origin'),
        'referer': request.headers.get('referer'),
        'cookie': request.headers.get('cookie') ? 'present' : 'missing'
      },
      cookies: {
        count: Object.keys(allCookies).length,
        names: Object.keys(allCookies),
        // Don't expose actual cookie values for security
      },
      supabase: {
        session: {
          exists: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          error: sessionError?.message
        },
        user: {
          exists: !!user,
          id: user?.id,
          error: userError?.message
        }
      }
    }
    
    return NextResponse.json(debugInfo)
    
  } catch (error) {
    return NextResponse.json({ 
      error: error.message,
      environment: 'vercel-production',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}