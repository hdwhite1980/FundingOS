// Simple 2FA Endpoint Test (run after deployment)
console.log('🎯 Testing New 2FA Endpoint After Deployment');

const testAfterDeployment = async () => {
  console.log('Waiting for deployment... Testing in 30 seconds');
  
  // Wait 30 seconds then test
  setTimeout(async () => {
    console.log('🔄 Testing /api/auth/2fa/setup-new...');
    
    try {
      const response = await fetch('/api/auth/2fa/setup-new', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          userId: 'test-deployment-check',
          timestamp: Date.now()
        })
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 404) {
        console.log('❌ Still 404 - deployment not complete or failed');
        console.log('💡 Try: Hard refresh (Ctrl+F5) and test again in 2 minutes');
      } else if (response.status === 405) {
        console.log('❌ Still 405 - possible export issue or cached version');
        console.log('💡 Try: Clear cache and hard refresh');
      } else {
        console.log('✅ Endpoint is live! (Error expected without proper auth)');
        const data = await response.json();
        console.log('Response:', data);
      }
      
    } catch (error) {
      console.log('❌ Test failed:', error.message);
    }
  }, 30000); // 30 second delay
  
  console.log('⏳ Will test in 30 seconds...');
};

testAfterDeployment();