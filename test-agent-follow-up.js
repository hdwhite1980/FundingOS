// Test agent follow-up response handling
const { supabase } = require('./lib/supabase')

async function testAgentFollowUp() {
  const testUserId = 'test-user-123'
  
  console.log('🧪 Testing Agent Follow-up Response Handling...\n')
  
  try {
    // First, simulate an agent message that would prompt a follow-up
    console.log('1. Creating initial agent conversation...')
    await supabase.from('agent_conversations').insert([
      {
        user_id: testUserId,
        role: 'assistant',
        content: 'I found several funding opportunities that match your projects. Would you like me to analyze them in detail and create recommendations for you?',
        metadata: { 
          context_type: 'opportunity_analysis',
          timestamp: new Date().toISOString() 
        },
        created_at: new Date().toISOString()
      }
    ])
    
    console.log('✅ Initial agent message created')
    
    // Test the chat endpoint with a follow-up response
    console.log('\n2. Testing follow-up response: "yes"')
    
    const response = await fetch('http://localhost:3000/api/ai/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        message: 'yes',
        projects: [
          {
            id: 1,
            name: 'Community Solar Project',
            project_type: 'renewable_energy',
            funding_needed: 250000,
            location: 'Denver, CO'
          }
        ],
        opportunities: [
          {
            id: 1,
            title: 'Clean Energy Innovation Grant',
            sponsor: 'Department of Energy',
            amount_max: 300000,
            deadline_date: '2024-03-15',
            project_types: ['renewable_energy'],
            organization_types: ['nonprofit'],
            geography: ['nationwide']
          }
        ]
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('\n✅ Agent Response:')
      console.log('---')
      console.log(result.message)
      console.log('---')
      
      // Check if the response indicates it understood the follow-up
      const responseText = result.message.toLowerCase()
      const followUpIndicators = [
        'analyzing',
        'analysis',
        'recommendations',
        'match',
        'clean energy innovation',
        'community solar'
      ]
      
      const detectedFollowUp = followUpIndicators.some(indicator => 
        responseText.includes(indicator)
      )
      
      if (detectedFollowUp) {
        console.log('\n🎉 SUCCESS: Agent correctly interpreted "yes" as a follow-up!')
        console.log('The response shows contextual understanding and continuation.')
      } else {
        console.log('\n❌ ISSUE: Agent may not have interpreted "yes" as a follow-up')
        console.log('Response seems generic rather than contextual.')
      }
      
    } else {
      console.log('❌ Chat request failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.log('Error details:', errorText)
    }
    
    // Test with a different follow-up
    console.log('\n3. Testing follow-up response: "tell me more"')
    
    const response2 = await fetch('http://localhost:3000/api/ai/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        message: 'tell me more',
        projects: [
          {
            id: 1,
            name: 'Community Solar Project',
            project_type: 'renewable_energy',
            funding_needed: 250000,
            location: 'Denver, CO'
          }
        ],
        opportunities: []
      })
    })
    
    if (response2.ok) {
      const result2 = await response2.json()
      console.log('\n✅ Agent Response to "tell me more":')
      console.log('---')
      console.log(result2.message)
      console.log('---')
    }
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
  
  // Clean up test data
  try {
    await supabase
      .from('agent_conversations')
      .delete()
      .eq('user_id', testUserId)
    console.log('\n🧹 Test data cleaned up')
  } catch (cleanupError) {
    console.log('Warning: Could not clean up test data:', cleanupError.message)
  }
}

// Run the test
testAgentFollowUp().then(() => {
  console.log('\n✅ Follow-up test completed!')
  process.exit(0)
}).catch(error => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})