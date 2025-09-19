// Test script to verify contextual analysis with debug output
// Run this with: node test-contextual-analysis.js

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

console.log('Environment check:')
console.log('- SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
console.log('- SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testContextualAnalysis() {
  console.log('🧪 Testing contextual analysis flow...')
  
  try {
    // Get a real user with projects and opportunities
    const { data: users } = await supabase
      .from('user_profiles')
      .select('user_id, organization_type, organization_name')
      .limit(1)
    
    if (!users || users.length === 0) {
      console.log('❌ No users found in database')
      return
    }
    
    const testUser = users[0]
    console.log('✅ Using test user:', testUser)
    
    // Get their projects
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', testUser.user_id)
      .limit(3)
    
    console.log(`📁 Found ${projects?.length || 0} projects for user`)
    
    // Get some opportunities 
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('*')
      .limit(10)
    
    console.log(`🎯 Found ${opportunities?.length || 0} opportunities`)
    
    if (!projects?.length || !opportunities?.length) {
      console.log('❌ Insufficient data for test')
      return
    }
    
    // Test the AI agent chat endpoint with contextual follow-up
    console.log('🤖 Testing AI agent with contextual analysis request...')
    
    const response = await fetch('http://localhost:3000/api/ai/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUser.user_id,
        message: 'what grants should I apply to',
        projects: projects,
        opportunities: opportunities
      })
    })
    
    console.log('Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ AI agent response:', data.message?.substring(0, 200) + '...')
      
      // Now test follow-up "yes" response
      console.log('🔄 Testing follow-up "yes" response...')
      
      const followupResponse = await fetch('http://localhost:3000/api/ai/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUser.user_id,
          message: 'yes',
          projects: projects,
          opportunities: opportunities
        })
      })
      
      console.log('Followup response status:', followupResponse.status)
      
      if (followupResponse.ok) {
        const followupData = await followupResponse.json()
        console.log('✅ Followup response:', followupData.message?.substring(0, 200) + '...')
        
        if (followupData.message.includes('analysis') || followupData.message.includes('opportunities')) {
          console.log('✅ Contextual follow-up working correctly!')
        } else {
          console.log('⚠️ Follow-up may not be contextual - check response')
        }
      } else {
        const errorData = await followupResponse.text()
        console.log('❌ Followup failed:', followupResponse.status, errorData)
      }
      
    } else {
      const errorData = await response.text()
      console.log('❌ AI agent failed:', response.status, errorData)
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testContextualAnalysis()