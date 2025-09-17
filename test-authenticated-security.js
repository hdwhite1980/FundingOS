// Test Security APIs while authenticated
// Run this in browser console after logging in

console.log('🔐 Testing Security APIs with Active Authentication...\n');

async function testAuthenticatedSecurity() {
  const baseURL = window.location.origin;
  console.log('🌐 Testing on:', baseURL);
  console.log('👤 User should be logged in\n');

  // Test all security endpoints
  const endpoints = [
    { path: '/api/auth/debug', method: 'GET', name: 'Debug Info' },
    { path: '/api/auth/2fa/status', method: 'GET', name: '2FA Status' },
    { path: '/api/auth/sessions', method: 'GET', name: 'Active Sessions' },
    { path: '/api/auth/devices', method: 'GET', name: 'Registered Devices' }
  ];

  console.log('📊 Testing authenticated endpoints...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 Testing ${endpoint.name}:`);
      
      const response = await fetch(`${baseURL}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.status === 200) {
        console.log(`   ✅ Success! Status: ${response.status}`);
        
        // Show relevant data based on endpoint
        if (endpoint.path.includes('debug')) {
          console.log(`   📋 Auth Method: ${data.authMethod || 'cookie'}`);
          console.log(`   🌍 Environment: ${data.environment}`);
          if (data.user) console.log(`   👤 User ID: ${data.user.id}`);
        } else if (endpoint.path.includes('2fa')) {
          console.log(`   🔐 2FA Enabled: ${data.enabled || false}`);
        } else if (endpoint.path.includes('sessions')) {
          console.log(`   📱 Active Sessions: ${data.sessions?.length || 0}`);
        } else if (endpoint.path.includes('devices')) {
          console.log(`   🖥️ Registered Devices: ${data.devices?.length || 0}`);
        }
      } else if (response.status === 401) {
        console.log(`   ❌ Unauthorized - Check if still logged in`);
        console.log(`   🔍 Debug:`, data.debug || data.error);
      } else {
        console.log(`   ⚠️ Unexpected Status: ${response.status}`);
        console.log(`   📦 Response:`, data);
      }
      
    } catch (error) {
      console.log(`   💥 Network Error: ${error.message}`);
    }
    
    console.log(''); // Add spacing
  }
  
  console.log('🎯 Summary:');
  console.log('✅ All 200 responses = Authentication working correctly');
  console.log('❌ Any 401 responses = Session may have expired, try logging in again');
  console.log('⚠️ Any 500 responses = Server error that needs fixing');
}

// Check authentication state first
console.log('🔍 Checking current authentication state...');

// Look for auth indicators
const authChecks = [
  document.cookie.includes('sb-'),
  document.querySelector('[data-user-authenticated]'),
  window.location.pathname.includes('dashboard'),
  document.title.includes('Dashboard')
];

const authScore = authChecks.filter(Boolean).length;
console.log(`📊 Auth indicators found: ${authScore}/4`);

if (authScore > 0) {
  console.log('✅ Appears to be authenticated, running tests...\n');
  testAuthenticatedSecurity();
} else {
  console.log('❌ May not be authenticated. Please:');
  console.log('   1. Log in to the application');  
  console.log('   2. Navigate to /dashboard or /security');
  console.log('   3. Run this test again');
  console.log('\n🚀 Running tests anyway...\n');
  testAuthenticatedSecurity();
}