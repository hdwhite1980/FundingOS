// Browser test for Security tab components - Run this in your browser console on your live site
// This will help us debug why the Security tab isn't showing up

console.log('🔍 Debugging Security Tab Components...');

async function debugSecurityComponents() {
  console.log('\n1️⃣ Testing API endpoints...');
  
  // Test each endpoint that the Security components depend on
  const endpoints = [
    '/api/auth/2fa/status',
    '/api/auth/devices', 
    '/api/auth/sessions'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing ${endpoint}...`);
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${endpoint}: ${response.status} - SUCCESS`);
        console.log('Response:', data);
      } else {
        console.log(`❌ ${endpoint}: ${response.status} - FAILED`);
        console.log('Error:', data);
      }
    } catch (error) {
      console.log(`💥 ${endpoint}: Network Error`);
      console.error(error);
    }
  }
  
  console.log('\n2️⃣ Testing authentication status...');
  
  // Check if user is properly authenticated
  console.log('Cookies:', document.cookie);
  console.log('Local storage auth:', localStorage.getItem('sb-kdsblzqddnfnxcamdddr-auth-token'));
  
  console.log('\n3️⃣ Testing debug endpoint...');
  try {
    const debugResponse = await fetch('/api/auth/debug');
    const debugData = await debugResponse.json();
    console.log('Debug response:', debugData);
  } catch (error) {
    console.log('Debug endpoint failed:', error);
  }
  
  console.log('\n4️⃣ Checking for component errors...');
  
  // Check if Security tab is visible in DOM
  const securityTab = document.querySelector('[data-tab="security"], button:contains("Security")');
  if (securityTab) {
    console.log('✅ Security tab button found in DOM');
    
    // Try to click it and see what happens
    try {
      securityTab.click();
      console.log('✅ Security tab clicked successfully');
      
      // Wait a moment and check for error messages
      setTimeout(() => {
        const errorMessages = document.querySelectorAll('.text-slate-500:contains("temporarily unavailable")');
        if (errorMessages.length > 0) {
          console.log('❌ Found "temporarily unavailable" error messages:', errorMessages.length);
        } else {
          console.log('✅ No "temporarily unavailable" messages found');
        }
      }, 1000);
      
    } catch (error) {
      console.log('❌ Error clicking security tab:', error);
    }
  } else {
    console.log('❌ Security tab button NOT found in DOM');
  }
  
  console.log('\n✨ Debug complete! Check the results above to see what\'s failing.');
}

// Run the debug
debugSecurityComponents();