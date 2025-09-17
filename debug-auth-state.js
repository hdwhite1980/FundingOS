// Debug Authentication State - run this in browser console
console.log('🔍 Debug Authentication State');

const debugAuth = async () => {
  console.log('=== CHECKING AUTH STATE ===');
  
  // Check localStorage for auth data
  console.log('\n📱 LocalStorage Auth Data:');
  const authData = localStorage.getItem('sb-supabase-auth-token') || 
                   localStorage.getItem('supabase.auth.token') ||
                   localStorage.getItem('sb-auth-token');
  
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      console.log('✅ Found auth data in localStorage');
      console.log('User ID:', parsed.user?.id || 'Not found');
      console.log('Email:', parsed.user?.email || 'Not found');
      console.log('Expires at:', new Date(parsed.expires_at * 1000));
    } catch (e) {
      console.log('❌ Found auth data but could not parse:', authData.substring(0, 100));
    }
  } else {
    console.log('❌ No auth data found in localStorage');
  }
  
  // Check cookies
  console.log('\n🍪 Cookie Auth Data:');
  const cookies = document.cookie.split(';').map(c => c.trim());
  const authCookies = cookies.filter(c => 
    c.includes('supabase') || 
    c.includes('auth') || 
    c.includes('session')
  );
  
  if (authCookies.length > 0) {
    console.log('✅ Found auth cookies:', authCookies);
  } else {
    console.log('❌ No auth cookies found');
  }
  
  // Test the debug endpoint to see what auth method works
  console.log('\n🔧 Testing Debug Endpoint:');
  try {
    const response = await fetch('/api/auth/debug', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ Debug endpoint success!');
      console.log('User from API:', data.user);
      console.log('Auth method:', data.authMethod);
    } else {
      console.log('❌ Debug endpoint failed');
      console.log('Error:', data.error);
      console.log('Debug:', data.debug);
    }
  } catch (error) {
    console.log('❌ Debug endpoint error:', error.message);
  }
  
  // Check what the useAuth hook would return
  console.log('\n⚛️ Component State Check:');
  console.log('Try refreshing the page and then clicking "Enable 2FA" again');
  console.log('Or try logging out and logging back in');
};

debugAuth();