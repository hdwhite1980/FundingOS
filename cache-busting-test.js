// Cache-busting Security Test - run this in browser console
console.log('🚫 Cache-busting Security Test');

const testWithCacheBusting = async () => {
  const timestamp = Date.now();
  
  console.log('Testing with cache busting parameter...');
  
  const endpoints = [
    `/api/auth/debug?t=${timestamp}`,
    `/api/auth/2fa/status?t=${timestamp}`, 
    `/api/auth/devices?t=${timestamp}`,
    `/api/auth/sessions?t=${timestamp}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📞 Testing ${endpoint}...`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = await response.json();
      
      console.log(`Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
      
      if (response.ok) {
        console.log('✅ SUCCESS! Preview:', JSON.stringify(data).substring(0, 150) + '...');
      } else {
        console.log('❌ FAILED');
        console.log('Error:', data.error);
        console.log('Debug info:', data.debug);
        
        // If it's still unauthorized, let's see what headers we're getting
        console.log('Response headers:');
        response.headers.forEach((value, key) => {
          if (key.includes('cache') || key.includes('etag') || key.includes('auth')) {
            console.log(`  ${key}: ${value}`);
          }
        });
      }
      
    } catch (err) {
      console.log(`❌ ${endpoint}: Network error - ${err.message}`);
    }
  }
  
  console.log('\n💡 If still failing:');
  console.log('1. Try a hard refresh (Ctrl+F5 or Cmd+Shift+R)');
  console.log('2. Clear browser cache for this site');
  console.log('3. Wait 2-3 more minutes for Vercel deployment to fully propagate');
  console.log('4. Try in incognito/private mode');
};

testWithCacheBusting();