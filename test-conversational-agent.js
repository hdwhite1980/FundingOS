// Test script for enhanced conversational agent
// This tests follow-up responses and conversation context

const testConversationalAgent = async () => {
  console.log('🤖 Testing Enhanced Conversational Agent...')
  
  // Test data
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000000' // Use test UUID
  const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  
  // Test scenarios
  const testScenarios = [
    {
      name: 'Initial Analysis Request',
      message: 'Can you analyze my funding opportunities?',
      expectedIntent: ['analyze_opportunities'],
      followUp: {
        message: 'yes',
        expectedIntent: ['continue_previous', 'analyze_opportunities']
      }
    },
    {
      name: 'More Details Request',
      message: 'tell me more',
      expectedIntent: ['expand_previous']
    },
    {
      name: 'Search Follow-up',
      setup: 'I need more funding opportunities',
      message: 'sure',
      expectedIntent: ['continue_previous']
    }
  ]
  
  try {
    console.log('\n📋 Running conversation flow tests...\n')
    
    for (const scenario of testScenarios) {
      console.log(`\n🔧 Testing: ${scenario.name}`)
      console.log(`Message: "${scenario.message}"`)
      
      const response = await fetch(`${API_BASE}/api/ai/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          message: scenario.message,
          projects: [
            {
              id: 1,
              name: 'Community Garden Project',
              project_type: 'environmental',
              funding_needed: 50000,
              location: 'San Francisco, CA'
            }
          ],
          opportunities: [
            {
              id: 1,
              title: 'Environmental Impact Grant',
              sponsor: 'Green Foundation',
              amount_max: 100000,
              deadline_date: '2024-02-15'
            }
          ]
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Response received:`)
        console.log(`"${data.message.substring(0, 150)}..."`)
        
        // Test follow-up if defined
        if (scenario.followUp) {
          console.log(`\n🔄 Testing follow-up: "${scenario.followUp.message}"`)
          
          const followUpResponse = await fetch(`${API_BASE}/api/ai/agent/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: TEST_USER_ID,
              message: scenario.followUp.message,
              projects: [
                {
                  id: 1,
                  name: 'Community Garden Project',
                  project_type: 'environmental',
                  funding_needed: 50000,
                  location: 'San Francisco, CA'
                }
              ],
              opportunities: [
                {
                  id: 1,
                  title: 'Environmental Impact Grant',
                  sponsor: 'Green Foundation',
                  amount_max: 100000,
                  deadline_date: '2024-02-15'
                }
              ]
            })
          })
          
          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json()
            console.log(`✅ Follow-up response:`)
            console.log(`"${followUpData.message.substring(0, 150)}..."`)
          } else {
            console.log(`❌ Follow-up failed:`, await followUpResponse.text())
          }
        }
      } else {
        console.log(`❌ Failed:`, await response.text())
      }
      
      // Wait between tests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('\n✅ Conversational agent tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
if (require.main === module) {
  testConversationalAgent()
}

module.exports = testConversationalAgent