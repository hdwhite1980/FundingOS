// scripts/test-chat-system.js
// Test script to verify chat session functionality

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testChatSystem() {
  console.log('🧪 Testing Chat Session System...\n')
  
  try {
    // Test 1: Check if tables exist
    console.log('1. Checking if chat session tables exist...')
    
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['chat_sessions', 'chat_messages'])
    
    if (tableError) {
      console.log('❌ Tables not found - you need to run the migration script')
      console.log('📝 Run this SQL in your Supabase dashboard:')
      console.log('   Copy the contents of database_chat_sessions.sql')
      return false
    }
    
    console.log('✅ Chat session tables found')
    
    // Test 2: Test session creation
    console.log('\n2. Testing session creation...')
    
    // Create a test user (you can replace this with a real user ID)
    const testUserId = 'test-user-' + Date.now()
    
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: testUserId,
        is_active: true
      })
      .select()
      .single()
      
    if (sessionError) {
      console.log('❌ Session creation failed:', sessionError.message)
      return false
    }
    
    console.log('✅ Session created:', session.id)
    
    // Test 3: Test message saving
    console.log('\n3. Testing message saving...')
    
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: session.id,
        user_id: testUserId,
        message_type: 'user',
        content: 'Test message'
      })
      .select()
      .single()
      
    if (messageError) {
      console.log('❌ Message saving failed:', messageError.message)
      return false
    }
    
    console.log('✅ Message saved:', message.id)
    
    // Test 4: Test session closure
    console.log('\n4. Testing session closure...')
    
    const { error: closeError } = await supabase.rpc('close_active_chat_sessions', {
      user_uuid: testUserId
    })
    
    if (closeError) {
      console.log('❌ Session closure failed:', closeError.message)
      return false
    }
    
    console.log('✅ Session closed successfully')
    
    // Cleanup
    await supabase.from('chat_sessions').delete().eq('user_id', testUserId)
    
    console.log('\n🎉 All tests passed! Chat system is ready.')
    return true
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message)
    return false
  }
}

// Run the test
testChatSystem().then(success => {
  process.exit(success ? 0 : 1)
})