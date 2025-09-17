// Comprehensive Auth Diagnosis - run this in browser console
console.log('🔬 Comprehensive Auth Diagnosis');

const comprehensiveAuthDiagnosis = async () => {
  console.log('\n=== STEP 1: CLIENT-SIDE AUTH CHECK ===');
  
  // Check if we're still logged in on the client side
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
      const { data: { user }, error: userError } = await window.supabase.auth.getUser();
      
      console.log('Client Supabase available:', true);
      console.log('Client session exists:', !!session);
      console.log('Client user exists:', !!user);
      console.log('Session error:', sessionError?.message);
      console.log('User error:', userError?.message);
      
      if (session) {
        console.log('Session details:');
        console.log('- Access token exists:', !!session.access_token);
        console.log('- Refresh token exists:', !!session.refresh_token);
        console.log('- Expires at:', new Date(session.expires_at * 1000));
        console.log('- User ID:', session.user?.id);
      }
      
      if (!session || !user) {
        console.log('❌ CLIENT SESSION LOST - Need to re-authenticate');
        console.log('💡 The page refresh cleared the client-side session');
        return 'CLIENT_SESSION_LOST';
      } else {
        console.log('✅ Client session still valid');
      }
      
    } catch (err) {
      console.log('❌ Error checking client auth:', err);
      return 'CLIENT_ERROR';
    }
  } else {
    console.log('❌ Supabase client not available');
    return 'NO_CLIENT';
  }
  
  console.log('\n=== STEP 2: BROWSER STORAGE CHECK ===');
  
  // Check what's in browser storage
  const localStorageKeys = Object.keys(localStorage).filter(k => 
    k.includes('supabase') || k.includes('sb-') || k.includes('auth')
  );
  const sessionStorageKeys = Object.keys(sessionStorage).filter(k => 
    k.includes('supabase') || k.includes('sb-') || k.includes('auth')
  );
  
  console.log('LocalStorage auth keys:', localStorageKeys);
  console.log('SessionStorage auth keys:', sessionStorageKeys);
  
  if (localStorageKeys.length > 0) {
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          console.log(`${key}:`, {
            hasAccessToken: !!parsed.access_token,
            hasRefreshToken: !!parsed.refresh_token,
            expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000) : null
          });
        } catch {
          console.log(`${key}: [Non-JSON value]`);
        }
      }
    });
  }
  
  console.log('\n=== STEP 3: COOKIE CHECK ===');
  
  const cookies = document.cookie.split(';').map(c => c.trim());
  const authCookies = cookies.filter(c => 
    c.includes('supabase') || c.includes('sb-') || c.includes('auth')
  );
  
  console.log('Auth cookies found:', authCookies.length);
  authCookies.forEach(cookie => {
    const [name] = cookie.split('=');
    console.log('- Cookie name:', name);
  });
  
  console.log('\n=== STEP 4: SERVER AUTH CHECK ===');
  
  try {
    const debugResponse = await fetch('/api/auth/debug');
    const debugData = await debugResponse.json();
    
    console.log('Server sees session:', debugData.supabase?.session?.exists);
    console.log('Server sees user:', debugData.supabase?.user?.exists);
    console.log('Server cookie count:', debugData.cookies?.count);
    console.log('Server cookie names:', debugData.cookies?.names);
    
  } catch (err) {
    console.log('❌ Server check failed:', err);
  }
  
  console.log('\n=== DIAGNOSIS & RECOMMENDATIONS ===');
  
  if (localStorageKeys.length === 0 && authCookies.length === 0) {
    console.log('🔍 DIAGNOSIS: Complete session loss');
    console.log('💡 SOLUTION: You need to log in again');
    console.log('   - The authentication session was completely cleared');
    console.log('   - This can happen due to browser settings or session expiry');
    
    return 'COMPLETE_SESSION_LOSS';
  }
  
  if (localStorageKeys.length > 0 && authCookies.length === 0) {
    console.log('🔍 DIAGNOSIS: Client session exists but no server cookies');
    console.log('💡 SOLUTION: Session sync issue between client and server');
    console.log('   - Try logging out and back in');
    console.log('   - Or use incognito mode for fresh session');
    
    return 'SYNC_ISSUE';
  }
  
  console.log('🔍 DIAGNOSIS: Unknown session issue');
  console.log('💡 SOLUTION: Try complete re-authentication');
  
  return 'UNKNOWN_ISSUE';
};

// Run diagnosis
comprehensiveAuthDiagnosis().then(result => {
  console.log('\n🏁 DIAGNOSIS RESULT:', result);
  
  if (result === 'COMPLETE_SESSION_LOSS' || result === 'CLIENT_SESSION_LOST') {
    console.log('\n🔑 NEXT STEPS:');
    console.log('1. Look for login form on this page');
    console.log('2. If no form, navigate to login page');
    console.log('3. Log in with: contact@ahts4me.com');
    console.log('4. After login, test security endpoints again');
  }
});