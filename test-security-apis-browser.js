// Test Security APIs in Browser Console WITH AND WITHOUT AUTH
// Copy and paste this into your browser's console

console.log('🧪 Testing Security APIs with Robust Authentication...\n');

// Enhanced test function that checks multiple auth scenarios
async function testSecurityAPIs() {
  const baseURL = window.location.origin;
  console.log('🌐 Testing on:', baseURL);

  // Test endpoints
  const endpoints = [
    { path: '/api/auth/2fa/status', method: 'GET' },
    { path: '/api/auth/sessions', method: 'GET' },
    { path: '/api/auth/devices', method: 'GET' },
    { path: '/api/auth/debug', method: 'GET' }
  ];

  console.log('\n📋 Testing Cookie-based Authentication...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing ${endpoint.method} ${endpoint.path}:`);
      
      const response = await fetch(`${baseURL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies
      });
      
      const data = await response.json();
      
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   🔒 Unauthorized (expected when not logged in)');
        if (data.debug) {
          console.log('   📊 Debug info:', data.debug);
        }
      } else if (response.status === 200) {
        console.log('   ✅ Success! User is authenticated');
        console.log('   � Data:', data);
      } else {
        console.log('   ⚠️ Unexpected status');
        console.log('   📦 Response:', data);
      }
      
    } catch (error) {
      console.log(`   ❌ Network error: ${error.message}`);
    }
  }

  // Check if user appears to be logged in by looking at the page
  console.log('\n🔍 Checking authentication state...');
  
  // Look for common auth indicators
  const authIndicators = [
    document.querySelector('[data-testid="user-menu"]'),
    document.querySelector('.user-profile'),
    document.querySelector('[href*="dashboard"]'),
    document.querySelector('button[aria-label*="profile"]'),
    document.cookie.includes('sb-') // Supabase cookies
  ].filter(Boolean);
  
  if (authIndicators.length > 0) {
    console.log('✅ User appears to be logged in (found auth indicators)');
    console.log('🔄 Re-running API tests for authenticated user...');
    
    // Re-test with slight delay for auth state
    setTimeout(() => {
      testEndpointsAgain();
    }, 1000);
  } else {
    console.log('❌ User appears to be logged out');
    console.log('💡 To test authenticated endpoints:');
    console.log('   1. Log in to the application');
    console.log('   2. Run this script again');
    console.log('   3. Or navigate to /dashboard and run the test there');
  }
}

async function testEndpointsAgain() {
  console.log('\n� Re-testing with authentication...');
  
  const response = await fetch('/api/auth/debug', {
    credentials: 'include'
  });
  
  const debugData = await response.json();
  console.log('🛠️ Auth Debug Response:', debugData);
  
  if (response.status === 200 && debugData.user) {
    console.log('🎉 Authentication confirmed! User ID:', debugData.user.id);
    
    // Test all endpoints again
    const endpoints = ['/api/auth/2fa/status', '/api/auth/sessions', '/api/auth/devices'];
    for (const endpoint of endpoints) {
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();
      console.log(`📡 ${endpoint}: ${res.status}`, res.status === 200 ? '✅' : '❌');
      if (res.status !== 200) {
        console.log('   Error:', data);
      }
    }
  } else {
    console.log('❌ Still not authenticated. Debug info:', debugData);
  }
}

// Instructions for manual testing
console.log('� INSTRUCTIONS:');
console.log('1. If you see 401 errors, that\'s expected when not logged in');
console.log('2. To test authenticated endpoints: log in first, then run this script');
console.log('3. The debug endpoint will show detailed auth state information');
console.log('4. Look for success indicators (✅) vs auth failures (🔒)');
console.log('\n🚀 Starting tests...');

// Run the test
testSecurityAPIs();