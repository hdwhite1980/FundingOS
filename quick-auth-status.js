// Quick status check for all auth endpoints
// Run this in browser console to quickly test endpoint status

async function quickAuthStatus() {
  console.log('⚡ Quick auth endpoints status check...');
  
  const endpoints = [
    '/api/auth/debug',
    '/api/auth/2fa/status', 
    '/api/auth/devices',
    '/api/auth/sessions'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${endpoint}: ${response.status} OK`);
      } else {
        console.log(`❌ ${endpoint}: ${response.status} - ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`💥 ${endpoint}: Network/Parse error - ${error.message}`);
    }
  }
  
  console.log('\n🎯 Status check complete!');
  console.log('✅ = Working properly');
  console.log('❌ = Auth or server error (check if logged in)');
  console.log('💥 = Network or build error');
}

// Run the quick check
quickAuthStatus();