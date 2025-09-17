// Enhanced Auth Debug - run this in browser console
console.log('🔍 Enhanced Auth Debug');

const debugAuth = async () => {
  console.log('=== CLIENT-SIDE AUTH STATE ===');
  
  // Check if we have access to the Supabase client
  if (typeof window !== 'undefined' && window.supabase) {
    console.log('✅ Supabase client found');
    
    const { data: session } = await window.supabase.auth.getSession();
    if (session?.session) {
      console.log('✅ Active session:', {
        userId: session.session.user.id,
        email: session.session.user.email,
        expires_at: new Date(session.session.expires_at * 1000).toISOString(),
        access_token: session.session.access_token.substring(0, 50) + '...'
      });
      
      // Test direct API call with Authorization header
      console.log('\n=== TESTING WITH AUTHORIZATION HEADER ===');
      const response = await fetch('/api/auth/2fa/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('API Response:', {
        status: response.status,
        success: response.ok,
        data
      });
      
      return session.session.access_token;
    }
  }
  
  // Fallback: check localStorage
  console.log('\n=== CHECKING LOCALSTORAGE ===');
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase')) {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (value && value.access_token) {
          console.log(`✅ Found token in ${key}:`, {
            access_token: value.access_token.substring(0, 50) + '...',
            expires_at: value.expires_at ? new Date(value.expires_at * 1000).toISOString() : 'unknown',
            user_id: value.user?.id
          });
        }
      } catch (e) {
        // Not JSON
      }
    }
  });
  
  // Check cookies
  console.log('\n=== CHECKING COOKIES ===');
  console.log('Document cookies:', document.cookie || 'No cookies');
  
  return null;
};

debugAuth().then(token => {
  if (token) {
    console.log('\n🎯 Use this token for manual testing:');
    console.log(token);
  }
});