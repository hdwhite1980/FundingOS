// Session Recovery Fix - run this in browser console
console.log('🔧 Session Recovery Fix');

const recoverSessionFromStorage = async () => {
  console.log('Attempting to recover session from localStorage...');
  
  // Get the stored auth token
  const authKey = 'sb-pcusbqltbvgebzcacvif-auth-token';
  const storedAuth = localStorage.getItem(authKey);
  
  if (storedAuth) {
    try {
      const authData = JSON.parse(storedAuth);
      console.log('✅ Found stored auth data');
      console.log('- Has access token:', !!authData.access_token);
      console.log('- Has refresh token:', !!authData.refresh_token);
      console.log('- Expires at:', authData.expires_at ? new Date(authData.expires_at * 1000) : 'No expiry');
      console.log('- User ID:', authData.user?.id);
      
      if (authData.access_token) {
        // Try to use the stored token to authenticate with the server
        console.log('🔄 Testing stored token with server...');
        
        const testResponse = await fetch('/api/auth/debug', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${authData.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const testData = await testResponse.json();
        
        if (testData.supabase?.user?.exists) {
          console.log('🎉 SUCCESS! Token is valid and server recognizes it');
          console.log('✅ Server-side authentication working');
          
          // Test security endpoints with the token
          console.log('\n🔒 Testing security endpoints with recovered session...');
          
          const endpoints = ['/api/auth/2fa/status', '/api/auth/devices', '/api/auth/sessions'];
          let workingCount = 0;
          
          for (const endpoint of endpoints) {
            try {
              const secResponse = await fetch(endpoint, {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Authorization': `Bearer ${authData.access_token}`
                }
              });
              
              if (secResponse.ok) {
                console.log(`✅ ${endpoint}: Working`);
                workingCount++;
              } else {
                console.log(`❌ ${endpoint}: Failed (${secResponse.status})`);
              }
            } catch (err) {
              console.log(`❌ ${endpoint}: Error - ${err.message}`);
            }
          }
          
          console.log(`\n📊 Result: ${workingCount}/3 security endpoints working`);
          
          if (workingCount === 3) {
            console.log('🎉 ALL SECURITY FEATURES RECOVERED AND WORKING!');
            console.log('💡 The session has been successfully restored');
            
            // Try to establish proper cookies by refreshing
            console.log('🔄 Attempting to establish proper session cookies...');
            const refreshPage = confirm('Session recovered! Refresh page to establish proper cookies?');
            if (refreshPage) {
              window.location.reload();
            }
          } else {
            console.log('⚠️ Partial recovery - some endpoints still not working');
          }
          
        } else {
          console.log('❌ Token exists but server doesn\'t recognize it');
          console.log('Server response:', testData);
          console.log('💡 Token may have expired - need to log in again');
          
          return 'TOKEN_INVALID';
        }
        
      } else {
        console.log('❌ No access token in stored data');
        return 'NO_TOKEN';
      }
      
    } catch (err) {
      console.log('❌ Error parsing stored auth data:', err);
      return 'PARSE_ERROR';
    }
  } else {
    console.log('❌ No stored auth data found');
    return 'NO_STORED_DATA';
  }
};

recoverSessionFromStorage();