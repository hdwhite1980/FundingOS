// Simple endpoint test for browser console
// Copy and paste this into your browser console on the live site

console.log('🧪 Testing Security Tab Dependencies...');

// Test the specific endpoints that Security components need
const testEndpoints = async () => {
  const baseUrl = window.location.origin;
  
  console.log('Base URL:', baseUrl);
  console.log('Current user auth check...');
  
  // Check auth first
  try {
    const authCheck = await fetch(`${baseUrl}/api/auth/debug`);
    const authData = await authCheck.json();
    console.log('Auth Debug:', authData);
    
    if (authCheck.ok && authData.authenticated) {
      console.log('✅ User is authenticated, testing security endpoints...');
      
      // Test each endpoint
      const endpoints = ['2fa/status', 'devices', 'sessions'];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`\nTesting /api/auth/${endpoint}...`);
          const response = await fetch(`${baseUrl}/api/auth/${endpoint}`);
          const data = await response.json();
          
          console.log(`Status: ${response.status}`);
          console.log('Response:', data);
          
          if (response.status === 401) {
            console.log('❌ Authentication failed - this is the problem!');
          } else if (response.status === 500) {
            console.log('❌ Server error - check backend implementation');
          } else if (response.ok) {
            console.log('✅ Endpoint working correctly');
          }
        } catch (err) {
          console.log(`❌ Network error for ${endpoint}:`, err);
        }
      }
      
    } else {
      console.log('❌ User not authenticated - this is why Security tab is empty');
    }
    
  } catch (err) {
    console.log('❌ Auth check failed:', err);
  }
};

testEndpoints();