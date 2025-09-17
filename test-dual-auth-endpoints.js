// Test script for all auth endpoints with dual authentication support
// Run this in browser console after logging in to test both cookie and Bearer token auth

console.log('🧪 Testing all auth endpoints with dual authentication...');

// Helper function to test an endpoint with both auth methods
async function testEndpointDualAuth(endpoint, method = 'GET', body = null) {
  console.log(`\n📡 Testing ${method} ${endpoint}`);
  
  // Test 1: Cookie-based authentication (default)
  console.log('🍪 Testing with cookie authentication...');
  try {
    const cookieResponse = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) })
    });
    
    const cookieData = await cookieResponse.json();
    console.log(`✅ Cookie auth: ${cookieResponse.status}`, cookieData);
  } catch (error) {
    console.error(`❌ Cookie auth error:`, error);
  }
  
  // Test 2: Bearer token authentication (from localStorage)
  console.log('🎟️ Testing with Bearer token authentication...');
  const authToken = localStorage.getItem('sb-kdsblzqddnfnxcamdddr-auth-token');
  
  if (authToken) {
    try {
      const token = JSON.parse(authToken);
      const bearerResponse = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.access_token}`,
        },
        ...(body && { body: JSON.stringify(body) })
      });
      
      const bearerData = await bearerResponse.json();
      console.log(`✅ Bearer auth: ${bearerResponse.status}`, bearerData);
    } catch (error) {
      console.error(`❌ Bearer auth error:`, error);
    }
  } else {
    console.log('⚠️ No Bearer token found in localStorage');
  }
}

// Test all our updated endpoints
async function runComprehensiveAuthTests() {
  console.log('🚀 Starting comprehensive auth endpoint tests...\n');
  
  // Test debug endpoint first
  await testEndpointDualAuth('/api/auth/debug');
  
  // Test 2FA status endpoint
  await testEndpointDualAuth('/api/auth/2fa/status');
  
  // Test devices endpoints
  await testEndpointDualAuth('/api/auth/devices');
  
  // Test sessions endpoint  
  await testEndpointDualAuth('/api/auth/sessions');
  
  console.log('\n✨ All auth endpoint tests completed!');
  console.log('\n📋 Summary:');
  console.log('- All endpoints should now support both cookie and Bearer token authentication');
  console.log('- Check above results for any 401 errors or authentication failures');
  console.log('- If Security tab works properly, you can now manage devices and sessions');
}

// Run the tests
runComprehensiveAuthTests();