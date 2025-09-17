// app/api/auth/test-helper/route.js
// Test endpoint to debug the simpleAuthHelper directly
import { NextResponse } from 'next/server'
import { getSimpleAuth } from '@/lib/simpleAuthHelper.js'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    console.log('🧪 Testing simpleAuthHelper...')
    
    const authResult = await getSimpleAuth(request)
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      authMethod: authResult.authMethod,
      hasUser: !!authResult.user,
      userId: authResult.user?.id,
      hasSession: !!authResult.session,
      hasSupabase: !!authResult.supabase,
      userEmail: authResult.user?.email,
      error: authResult.error || null
    }
    
    if (authResult.user) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        debug: debugInfo
      })
    } else {
      return NextResponse.json({
        success: false,
        authenticated: false,
        debug: debugInfo,
        error: 'No user found'
      }, { status: 401 })
    }
    
  } catch (error) {
    console.error('Test helper error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}