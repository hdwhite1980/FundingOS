// Enhanced debug for browser console - run this on your live site
console.log('🔍 Enhanced Auth Debug');

const debugAuth = async () => {
  try {
    // Get debug info
    const debugResponse = await fetch('/api/auth/debug');
    const debugData = await debugResponse.json();
    console.log('Debug data:', JSON.stringify(debugData, null, 2));
    
    // Check if user is authenticated in debug
    const isAuthenticated = debugData.supabase?.user?.exists || debugData.supabase?.session?.exists;
    console.log('Debug shows authenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      console.log('User ID from debug:', debugData.supabase?.user?.id || debugData.supabase?.session?.userId);
      
      // The debug endpoint works but our security endpoints don't
      // This suggests a difference in how they handle auth
      console.log('❌ Auth helper issue: Debug works but security endpoints fail');
      
      // Check what cookies are actually available
      console.log('Document cookies:', document.cookie.split(';').map(c => c.split('=')[0].trim()));
      
      // Check localStorage auth
      const localAuth = localStorage.getItem('sb-kdsblzqddnfnxcamdddr-auth-token');
      if (localAuth) {
        try {
          const authData = JSON.parse(localAuth);
          console.log('LocalStorage auth token exists, expires:', new Date(authData.expires_at * 1000));
        } catch (e) {
          console.log('LocalStorage auth token exists but invalid JSON');
        }
      } else {
        console.log('No localStorage auth token found');
      }
      
    } else {
      console.log('❌ Not authenticated according to debug endpoint');
    }
    
  } catch (error) {
    console.log('Debug failed:', error);
  }
};

debugAuth();