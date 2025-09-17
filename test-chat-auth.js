// Test authentication status for debugging chat issues
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuthStatus() {
  console.log('🔍 TESTING AUTHENTICATION STATUS...\n')
  
  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.log('❌ Session Error:', sessionError.message)
      return
    }
    
    if (!session) {
      console.log('❌ NO ACTIVE SESSION FOUND')
      console.log('📋 This means the user is not logged in')
      console.log('🔧 SOLUTIONS:')
      console.log('  1. Make sure user is logged in via AuthPage')
      console.log('  2. Check if session cookies are being set properly')
      console.log('  3. Verify NEXT_PUBLIC_SUPABASE_URL and keys are correct')
      return
    }
    
    console.log('✅ ACTIVE SESSION FOUND:')
    console.log('  📧 User Email:', session.user.email)
    console.log('  🆔 User ID:', session.user.id)
    console.log('  ⏰ Expires:', new Date(session.expires_at * 1000).toISOString())
    
    // Test API endpoint that's failing
    console.log('\n🧪 TESTING CHAT SAVE-MESSAGE ENDPOINT...')
    
    const testMessage = {
      messageType: 'user',
      content: 'Test message for debugging',
      metadata: { test: true }
    }
    
    const response = await fetch('http://localhost:3000/api/chat/save-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}` // Try with explicit auth header
      },
      body: JSON.stringify(testMessage)
    })
    
    const result = await response.text()
    console.log(`📡 Response Status: ${response.status}`)
    console.log(`📄 Response Body: ${result}`)
    
    if (response.status === 401) {
      console.log('\n❌ STILL GETTING 401 - AUTHENTICATION ISSUE')
      console.log('🔧 POSSIBLE FIXES:')
      console.log('  1. Frontend and backend cookie handling mismatch')
      console.log('  2. Session not being passed correctly to API routes')
      console.log('  3. Need to check how cookies are being set in browser')
    } else if (response.status === 200) {
      console.log('\n✅ CHAT ENDPOINT WORKING WITH EXPLICIT AUTH')
    }
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message)
  }
}

testAuthStatus()