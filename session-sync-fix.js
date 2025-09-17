// Session Sync Fix - run this in browser console
console.log('🔄 Session Sync Fix');

const fixSessionSync = async () => {
  console.log('Attempting to sync client session with server...');
  
  // Check if we can access the Supabase client
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      console.log('✅ Supabase client available');
      
      // Get the current session from client
      const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
      
      if (session && session.access_token) {
        console.log('✅ Client has valid session');
        console.log('Access token exists:', !!session.access_token);
        console.log('User ID:', session.user?.id);
        
        // Try to manually set the session cookie by making a request with the token
        console.log('🔄 Attempting to establish server session...');
        
        const syncResponse = await fetch('/api/auth/debug', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const syncData = await syncResponse.json();
        
        if (syncData.supabase?.user?.exists) {
          console.log('🎉 SESSION SYNC SUCCESS!');
          console.log('Server now recognizes user:', syncData.supabase.user.id);
          
          // Test security endpoints
          console.log('🔒 Testing security endpoints...');
          const testSecurity = await fetch('/api/auth/2fa/status', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          
          const securityData = await testSecurity.json();
          console.log('Security endpoint result:', testSecurity.status, testSecurity.ok ? '✅' : '❌');
          
        } else {
          console.log('❌ Session sync failed');
          console.log('Server response:', syncData);
          
          // Try page refresh approach
          console.log('💡 Trying page refresh to establish cookies...');
          const shouldRefresh = confirm('Session sync failed. Try refreshing the page to establish server cookies?');
          if (shouldRefresh) {
            window.location.reload();
            return;
          }
        }
        
      } else {
        console.log('❌ No valid client session found');
        console.log('Session error:', sessionError);
        console.log('💡 You may need to log in again');
      }
      
    } catch (err) {
      console.error('❌ Session sync failed:', err);
      console.log('💡 Try refreshing the page or logging out and back in');
    }
  } else {
    console.log('❌ Supabase client not available');
    console.log('💡 Try refreshing the page first');
  }
};

fixSessionSync();