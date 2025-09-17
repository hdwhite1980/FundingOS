// test-all-auth-endpoints.js
// Test all patched authentication endpoints to verify Vercel compatibility

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

async function testEndpoint(path, options = {}) {
  const url = `${BASE_URL}/api${path}`
  console.log(`\n🧪 Testing: ${path}`)
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include'
    })
    
    const data = await response.json()
    console.log(`   Status: ${response.status}`)
    console.log(`   Response:`, data)
    
    return { status: response.status, data }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message)
    return { error: error.message }
  }
}

async function runTests() {
  console.log(`🚀 Testing Authentication Endpoints`)
  console.log(`Base URL: ${BASE_URL}`)
  
  // Test debug endpoint first to see auth state
  await testEndpoint('/auth/debug')
  
  // Test 2FA endpoints (should return 401 if not authenticated)
  await testEndpoint('/auth/2fa/status')
  
  // Test sessions endpoint
  await testEndpoint('/auth/sessions')
  
  // Test devices endpoint
  await testEndpoint('/auth/devices')
  
  // Test 2FA setup (POST, should be 401)
  await testEndpoint('/auth/2fa/setup', { 
    method: 'POST' 
  })
  
  // Test delete account (should be 401)
  await testEndpoint('/auth/delete-account', { 
    method: 'DELETE',
    body: { confirmationText: 'test' }
  })
  
  // Test chat endpoints
  await testEndpoint('/chat/save-message', {
    method: 'POST',
    body: { messageType: 'user', content: 'test message' }
  })
  
  await testEndpoint('/chat/logout', {
    method: 'POST'
  })
  
  console.log('\n✅ All endpoint tests completed!')
  console.log('\n📝 Expected results:')
  console.log('   - All endpoints should return consistent responses (not 500 errors)')
  console.log('   - Unauthenticated requests should return 401 errors')
  console.log('   - Debug endpoint should show cookie/session information')
  console.log('\n🔧 To test with authentication:')
  console.log('   1. Log in to your app first')
  console.log('   2. Run this test with browser cookies')
  console.log('   3. Or use browser dev tools to test endpoints directly')
}

runTests().catch(console.error)