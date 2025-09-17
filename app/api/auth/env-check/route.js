// app/api/auth/env-check/route.js
// Check if environment variables are properly loaded in Vercel
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const envCheck = {
      timestamp: new Date().toISOString(),
      environment: 'vercel-production',
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
        url_valid: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost')),
        anon_key_present: !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'anon-key'),
        service_role_present: !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'service-role-key'),
        nextauth_url: process.env.NEXTAUTH_URL || 'NOT_SET'
      },
      request_info: {
        host: request.headers.get('host'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        user_agent: request.headers.get('user-agent')?.substring(0, 50) + '...'
      }
    }
    
    // Try to create a Supabase client to test connection
    if (envCheck.supabase.url_valid && envCheck.supabase.anon_key_present) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        
        // Test basic connection and check for required tables
        const { data, error } = await supabase
          .from('user_profiles')
          .select('count')
          .limit(1)
        
        if (error && error.message?.includes('does not exist')) {
          // Try the old profiles table name
          const { data: altData, error: altError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1)
          
          envCheck.connection_test = {
            success: false,
            error: 'user_profiles table does not exist (tried profiles: ' + (altError?.message || 'also missing') + ')',
            can_query_db: false,
            table_status: {
              user_profiles_exists: false,
              profiles_exists: !altError,
              needs_schema_setup: true
            }
          }
        } else {
          envCheck.connection_test = {
            success: !error,
            error: error?.message || null,
            can_query_db: !!data,
            table_status: {
              user_profiles_exists: !error,
              profiles_exists: null,
              needs_schema_setup: !!error
            }
          }
        }
      } catch (connError) {
        envCheck.connection_test = {
          success: false,
          error: connError.message,
          can_query_db: false
        }
      }
    } else {
      envCheck.connection_test = {
        success: false,
        error: 'Invalid environment variables',
        can_query_db: false
      }
    }
    
    return NextResponse.json(envCheck)
    
  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
      environment: 'vercel-production'
    }, { status: 500 })
  }
}