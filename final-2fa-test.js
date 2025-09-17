// Final 2FA Test - run this after deployment
console.log('🎯 Final 2FA Endpoint Test');

const finalTest = async () => {
  console.log('=== TESTING FIXED ENDPOINTS ===');
  
  const endpoints = [
    '/api/auth/2fa/setup-new',
    '/api/auth/2fa/verify-new', 
    '/api/auth/2fa/disable-new'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📍 Testing ${endpoint}...`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' 
        },
        body: JSON.stringify({ 
          userId: 'test-user-id',
          timestamp: Date.now()
        })
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 404) {
        console.log('❌ ENDPOINT NOT FOUND - deployment incomplete');
      } else if (response.status === 405) {
        console.log('❌ METHOD NOT ALLOWED - export issue');  
      } else if (response.status >= 400 && response.status < 500) {
        console.log('✅ ENDPOINT IS LIVE! (client error expected)');
        try {
          const data = await response.json();
          console.log('Response:', data.error || data.message);
        } catch (e) {
          console.log('Response parsing error (might be HTML)');
        }
      } else {
        console.log('✅ ENDPOINT IS WORKING!');
        const data = await response.json();
        console.log('Response:', data);
      }
      
    } catch (error) {
      console.log('❌ Network error:', error.message);
    }
  }
  
  console.log('\n=== FRONTEND TEST ===');
  console.log('Now try clicking "Enable 2FA" in the Security tab');
  console.log('The "Cannot read properties of undefined" error should be fixed');
};

// Run immediately and also set up a delayed test
finalTest();

// Also test in 2 minutes
setTimeout(() => {
  console.log('\n⏰ Running delayed test (2 minutes later)...');
  finalTest();
}, 120000);

console.log('💡 Test will also run automatically in 2 minutes');