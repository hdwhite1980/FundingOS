// Test the actual assistant endpoint with a real call
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qsfyasvsewexmqeiwrxp.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnlhc3ZzZXdleG1xZWl3cnhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDUxMzg5NSwiZXhwIjoyMDQ2MDg5ODk1fQ.GnYPDW_Aw6HHgdEPqKv13FmJZNqsC2eL4U-8IuYBc2I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDatabaseTables() {
  console.log('\n🔍 Testing database tables and data...\n')
  
  const tables = ['projects', 'user_profiles', 'company_settings', 'submissions', 'opportunities', 'profiles']
  
  for (const table of tables) {
    try {
      console.log(`📊 Checking ${table} table...`)
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(5)
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`)
      } else {
        console.log(`   ✅ Found ${count} total records, showing first ${data?.length || 0}:`)
        if (data && data.length > 0) {
          data.forEach((record, index) => {
            const summary = Object.keys(record).slice(0, 4).map(key => `${key}: ${record[key]}`).join(', ')
            console.log(`      ${index + 1}. ${summary}...`)
          })
        }
      }
    } catch (err) {
      console.log(`   ❌ Table ${table} doesn't exist or error: ${err.message}`)
    }
    console.log('')
  }
}

async function testAssistantEndpoint() {
  console.log('\n🤖 Testing assistant endpoint...\n')
  
  try {
    // Get a real user ID first
    const { data: users } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(1)
    
    if (!users || users.length === 0) {
      console.log('❌ No users found in profiles table')
      
      // Try user_profiles instead
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_id')
        .limit(1)
      
      if (userProfiles && userProfiles.length > 0) {
        console.log(`✅ Found user in user_profiles: ${userProfiles[0].user_id}`)
        await callAssistantAPI(userProfiles[0].user_id)
      } else {
        console.log('❌ No users found in user_profiles table either')
        // Use a test user ID
        await callAssistantAPI('test-user-123')
      }
    } else {
      console.log(`✅ Found user in profiles: ${users[0].user_id}`)
      await callAssistantAPI(users[0].user_id)
    }
  } catch (error) {
    console.error('❌ Error testing assistant:', error.message)
  }
}

async function callAssistantAPI(userId) {
  console.log(`\n📞 Testing assistant API call with userId: ${userId}`)
  
  const testData = {
    userId: userId,
    message: "What's my EIN?",
    useLLM: false // Test heuristic first
  }
  
  try {
    const response = await fetch('http://localhost:3000/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ Assistant API Response:')
      console.log(`   Intent: ${result.data?.intent}`)
      console.log(`   Used LLM: ${result.data?.usedLLM}`)
      console.log(`   Context Meta:`, result.data?.contextMeta)
      console.log(`   Message: ${result.data?.message?.substring(0, 200)}...`)
    } else {
      console.log('❌ Assistant API Error:', result.error)
    }
  } catch (error) {
    console.log('❌ Failed to call assistant API:', error.message)
    console.log('   (Make sure the dev server is running with npm run dev)')
  }
}

// Run tests
if (require.main === module) {
  testDatabaseTables().then(() => testAssistantEndpoint())
}

module.exports = { testDatabaseTables, testAssistantEndpoint }