// Quick Endpoint Test - run this in browser console
console.log('🔍 Quick Endpoint Test');

const quickTest = async () => {
  console.log('=== CHECKING ENDPOINT AVAILABILITY ===');
  
  try {
    // Test if the endpoint exists at all (even if it fails, we should get a proper error response)
    console.log('🔄 Testing endpoint availability...');
    
    const response = await fetch('/api/auth/2fa/setup-new', {
      method: 'GET', // Try GET first to see if endpoint exists
    });
    
    console.log(`GET Status: ${response.status}`);
    
    if (response.status === 405) {
      console.log('✅ Endpoint exists but only allows POST (this is expected)');
    } else if (response.status === 404) {
      console.log('❌ Endpoint not found - deployment may not be complete');
    } else {
      console.log('📊 Unexpected status - checking response...');
    }
    
    // Now try POST with minimal data
    console.log('\n🔄 Testing POST method...');
    const postResponse = await fetch('/api/auth/2fa/setup-new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    console.log(`POST Status: ${postResponse.status}`);
    
    try {
      const data = await postResponse.json();
      console.log('Response data:', data);
    } catch (e) {
      console.log('No JSON response (might be HTML error page)');
      const text = await postResponse.text();
      console.log('Response text:', text.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

quickTest();