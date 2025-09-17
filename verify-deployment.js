// Deployment Verification Script
console.log('🚀 Vercel Deployment Verification');

const verifyDeployment = async () => {
  console.log('=== CHECKING ALL 2FA ENDPOINTS ===');
  
  const endpoints = [
    '/api/auth/2fa/status',        // Should work (existing)
    '/api/auth/2fa/setup-new',     // New endpoint (should work)  
    '/api/auth/2fa/verify-new',    // New endpoint (should work)
    '/api/auth/2fa/disable-new'    // New endpoint (should work)
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📍 Testing ${endpoint}`);
    
    try {
      // Test OPTIONS first to see what methods are allowed
      const optionsResponse = await fetch(endpoint, {
        method: 'OPTIONS'
      });
      console.log(`OPTIONS: ${optionsResponse.status}`);
      
      // Check allowed methods in headers
      const allowedMethods = optionsResponse.headers.get('Allow') || 
                           optionsResponse.headers.get('access-control-allow-methods') || 
                           'Not specified';
      console.log(`Allowed methods: ${allowedMethods}`);
      
      // Test POST (all endpoints should support POST)
      const postResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'deployment_check' })
      });
      
      console.log(`POST: ${postResponse.status}`);
      
      if (postResponse.status === 404) {
        console.log('❌ ENDPOINT NOT DEPLOYED');
      } else if (postResponse.status === 405) {
        console.log('⚠️  METHOD NOT ALLOWED (might be deployment issue)');
      } else if (postResponse.status >= 400) {
        console.log('✅ ENDPOINT EXISTS (error expected without auth)');
        try {
          const errorData = await postResponse.json();
          console.log('Error response:', errorData.error);
        } catch (e) {
          console.log('Non-JSON error response');
        }
      } else {
        console.log('✅ ENDPOINT WORKING');
      }
      
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
  }
  
  console.log('\n=== DEPLOYMENT STATUS ===');
  console.log('If any endpoints show 404:');
  console.log('1. Deployment is still in progress');
  console.log('2. Build failed (check Vercel dashboard)');
  console.log('3. Cache needs clearing');
  
  console.log('\nIf endpoints show 405:');
  console.log('1. Route file exists but has export issues');
  console.log('2. Vercel is serving old cached version');
  console.log('3. Need to force fresh deployment');
};

verifyDeployment();