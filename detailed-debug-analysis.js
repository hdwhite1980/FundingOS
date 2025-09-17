// Detailed Debug Analysis - run this in browser console
console.log('🔍 Detailed Debug Analysis');

const detailedDebugAnalysis = async () => {
  console.log('Testing current auth state and debug response...');
  
  try {
    const debugResponse = await fetch('/api/auth/debug', {
      method: 'GET',
      credentials: 'include'
    });
    
    const debugData = await debugResponse.json();
    
    console.log('=== DEBUG ENDPOINT FULL RESPONSE ===');
    console.log(JSON.stringify(debugData, null, 2));
    
    console.log('\n=== ANALYSIS ===');
    console.log('Status:', debugResponse.status);
    console.log('Session exists:', debugData.supabase?.session?.exists);
    console.log('User exists:', debugData.supabase?.user?.exists);
    console.log('User ID from session:', debugData.supabase?.session?.userId);
    console.log('User ID from user:', debugData.supabase?.user?.id);
    console.log('Session error:', debugData.supabase?.session?.error);
    console.log('User error:', debugData.supabase?.user?.error);
    
    // Check if there's a difference between deployment URLs
    const currentUrl = window.location.hostname;
    const debugUrl = '/api/auth/debug';
    console.log('\nURL Analysis:');
    console.log('Current hostname:', currentUrl);
    console.log('Request going to:', debugUrl);
    
    // Test with explicit credentials and headers
    console.log('\n=== TESTING WITH EXPLICIT HEADERS ===');
    const testResponse = await fetch('/api/auth/2fa/status', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    const testData = await testResponse.json();
    console.log('2FA Status with explicit headers:');
    console.log('Status:', testResponse.status);
    console.log('Response:', testData);
    
    // If still failing, there might be a deployment sync issue
    if (testResponse.status === 401) {
      console.log('\n⚠️ POSSIBLE ISSUES:');
      console.log('1. Vercel deployment still propagating (wait 2-3 more minutes)');
      console.log('2. Browser cache - try hard refresh (Ctrl+F5)');
      console.log('3. Different auth state between debug and security endpoints');
      console.log('4. RLS policy issue in database');
      
      // Check browser cache status
      const cacheHeaders = testResponse.headers.get('cache-control');
      const etag = testResponse.headers.get('etag');
      console.log('Response cache headers:', cacheHeaders);
      console.log('ETag:', etag);
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
};

detailedDebugAnalysis();