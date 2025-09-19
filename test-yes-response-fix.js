// Test script to verify the "yes" response fix
// This simulates the exact conversation flow

console.log('🧪 Testing "yes" response fix...')

// Mock the conversation that should now work
const testConversation = async () => {
  const API_BASE = 'http://localhost:3000'
  const TEST_USER_ID = 'user-test-' + Date.now()
  
  try {
    // Step 1: Ask about grants (this should work and offer analysis)
    console.log('\n1. Initial question: "what grants should I apply to"')
    
    const initialResponse = await fetch(`${API_BASE}/api/ai/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        message: 'what grants should I apply to',
        projects: [{
          id: 1,
          name: 'Clean Energy Innovation Project',
          project_type: 'environmental',
          funding_needed: 75000,
          location: 'California'
        }],
        opportunities: [
          {
            id: 1,
            title: 'Advanced Technological Education (ATE)',
            sponsor: 'National Science Foundation (NSF)',
            amount_max: 3000000,
            deadline_date: '2024-10-01',
            project_types: ['education', 'technology']
          },
          {
            id: 2,
            title: 'Rural Community Development Program',
            sponsor: 'HHS-ACF-OCS',
            deadline_date: '2025-09-05'
          }
        ]
      })
    })
    
    if (initialResponse.ok) {
      const initialData = await initialResponse.json()
      console.log('✅ Initial response received:')
      console.log(`"${initialData.message.substring(0, 200)}..."`)
      
      // Check if it asks for analysis
      const asksForAnalysis = initialData.message.toLowerCase().includes('analyze') || 
                            initialData.message.toLowerCase().includes('would you like me to')
      
      if (asksForAnalysis) {
        console.log('✅ Initial response correctly offers to analyze opportunities')
        
        // Step 2: Respond with "yes" (this should now work!)
        console.log('\n2. Follow-up response: "yes"')
        
        // Wait a moment to ensure conversation is stored
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const followUpResponse = await fetch(`${API_BASE}/api/ai/agent/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: TEST_USER_ID,
            message: 'yes',
            projects: [{
              id: 1,
              name: 'Clean Energy Innovation Project',
              project_type: 'environmental',
              funding_needed: 75000,
              location: 'California'
            }],
            opportunities: [
              {
                id: 1,
                title: 'Advanced Technological Education (ATE)',
                sponsor: 'National Science Foundation (NSF)',
                amount_max: 3000000,
                deadline_date: '2024-10-01',
                project_types: ['education', 'technology']
              }
            ]
          })
        })
        
        if (followUpResponse.ok) {
          const followUpData = await followUpResponse.json()
          console.log('✅ Follow-up response received:')
          console.log(`"${followUpData.message.substring(0, 300)}..."`)
          
          // Check if it's the generic response or actual analysis
          const isGenericResponse = followUpData.message.includes("I understand you're asking about")
          const isAnalysisResponse = followUpData.message.toLowerCase().includes('match') || 
                                   followUpData.message.toLowerCase().includes('recommend') ||
                                   followUpData.message.toLowerCase().includes('analysis')
          
          if (isGenericResponse) {
            console.log('❌ STILL BROKEN: Got generic "I understand you\'re asking about" response')
          } else if (isAnalysisResponse) {
            console.log('🎉 SUCCESS: "yes" correctly triggered grant analysis!')
          } else {
            console.log('⚠️ UNCLEAR: Got a different response type')
          }
        } else {
          const errorText = await followUpResponse.text()
          console.log('❌ Follow-up request failed:', errorText)
        }
        
      } else {
        console.log('❌ Initial response didn\'t offer analysis')
      }
      
    } else {
      const errorText = await initialResponse.text()
      console.log('❌ Initial request failed:', errorText)
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Only run if server is available
console.log('Note: This test requires the development server to be running on localhost:3000')
console.log('If the server is not running, this test will fail.')

testConversation()