// Test profile API endpoint directly
const testProfileAPI = async () => {
  console.log('Testing profile API endpoint...')
  
  // This would normally be a real user ID from your database
  // Replace this with an actual user ID when testing
  const testUserId = 'test-user-id-here'
  
  try {
    console.log(`Testing GET /api/user/profile/${testUserId}`)
    
    const response = await fetch(`http://localhost:3000/api/user/profile/${testUserId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)
    
    const data = await response.json()
    console.log('Response data:', JSON.stringify(data, null, 2))
    
    if (data.profile) {
      console.log('Profile setup_completed:', data.profile.setup_completed)
    }
    
  } catch (error) {
    console.error('API test error:', error)
  }
}

// Instructions for manual testing
console.log('=== Manual API Testing Instructions ===')
console.log('1. Start your development server: npm run dev')
console.log('2. Complete the onboarding process for a user')
console.log('3. Note the user ID from browser console logs')
console.log('4. Replace "test-user-id-here" in this file with the real user ID')
console.log('5. Run this test: node test-profile-api.js')
console.log('6. Verify that setup_completed is true in the response')

// Comment out the actual test call since we don't have a real user ID
// testProfileAPI()