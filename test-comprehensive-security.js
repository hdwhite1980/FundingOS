// Comprehensive Security Tab Test
// Run this after deployment completes

console.log('🔐 Comprehensive Security Tab Authentication Test\n');

async function comprehensiveSecurityTest() {
  const baseURL = window.location.origin;
  console.log('🌐 Testing on:', baseURL);
  
  // Test 1: Verify deployment version
  console.log('📋 Step 1: Verify Deployment...');
  try {
    const debugResponse = await fetch('/api/auth/debug', { credentials: 'include' });
    const debugData = await debugResponse.json();
    console.log(`   Debug Status: ${debugResponse.status}`);
    console.log(`   Environment: ${debugData.environment}`);
    console.log(`   Timestamp: ${debugData.timestamp}`);
    
    if (debugData.user) {
      console.log(`   ✅ User authenticated in debug: ${debugData.user.id}`);
    } else {
      console.log(`   ❌ No user in debug response`);
    }
  } catch (error) {
    console.log(`   ❌ Debug endpoint error: ${error.message}`);
  }
  
  console.log('\n📋 Step 2: Test All Security Endpoints...');
  
  const endpoints = [
    { path: '/api/auth/2fa/status', name: '2FA Status' },
    { path: '/api/auth/sessions', name: 'Sessions' },
    { path: '/api/auth/devices', name: 'Devices' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing ${endpoint.name}:`);
      
      const response = await fetch(endpoint.path, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      const result = {
        endpoint: endpoint.path,
        status: response.status,
        authMethod: data.authMethod || data.debug?.authMethod || 'unknown',
        working: response.status === 200
      };
      
      results.push(result);
      
      console.log(`   Status: ${result.status} ${result.working ? '✅' : '❌'}`);
      console.log(`   Auth Method: ${result.authMethod}`);
      
      if (result.working) {
        // Show relevant data for successful responses
        if (endpoint.path.includes('2fa')) {
          console.log(`   2FA Enabled: ${data.enabled || false}`);
        } else if (endpoint.path.includes('sessions')) {
          console.log(`   Sessions: ${data.sessions?.length || 0}`);
        } else if (endpoint.path.includes('devices')) {
          console.log(`   Devices: ${data.devices?.length || 0}`);
        }
      } else if (data.debug) {
        console.log(`   Debug Info:`, data.debug);
      }
      
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
      results.push({
        endpoint: endpoint.path,
        status: 'error',
        authMethod: 'error',
        working: false
      });
    }
  }
  
  // Summary
  console.log('\n🎯 FINAL RESULTS:');
  console.log('==================');
  
  const workingCount = results.filter(r => r.working).length;
  const totalCount = results.length;
  
  results.forEach(result => {
    console.log(`${result.endpoint}: ${result.working ? '✅ WORKING' : '❌ FAILED'} (${result.status})`);
  });
  
  console.log(`\n📊 Overall: ${workingCount}/${totalCount} endpoints working`);
  
  if (workingCount === totalCount) {
    console.log('🎉 SUCCESS! Security tab should work perfectly!');
    console.log('💡 All endpoints authenticated properly');
  } else if (workingCount === 0) {
    console.log('❌ Authentication not working - may need to log in again');
  } else {
    console.log('⚠️ Mixed results - some endpoints working');
  }
  
  // Check for deployment version
  const authMethods = results.map(r => r.authMethod);
  if (authMethods.includes('cookie_v2')) {
    console.log('✅ New deployment detected (cookie_v2)');
  } else if (authMethods.includes('cookie')) {
    console.log('⏳ Old deployment still active');
  } else {
    console.log('❓ Deployment status unclear');
  }
}

// Auto-run after a short delay
setTimeout(() => {
  console.log('Starting comprehensive test...\n');
  comprehensiveSecurityTest();
}, 1000);