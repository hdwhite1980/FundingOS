// Post-Login Verification - run this in browser console
console.log('🔍 Post-Login Verification');

const verifyLoginSuccess = async () => {
  console.log('Login appears successful on client side!');
  console.log('Waiting 5 seconds for server session to sync...');
  
  // Wait for server session to sync
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('\n🔍 Step 1: Check Debug Endpoint');
  try {
    const debugResponse = await fetch('/api/auth/debug', {
      method: 'GET',
      credentials: 'include'
    });
    const debugData = await debugResponse.json();
    
    console.log('Debug status:', debugResponse.status);
    console.log('Session exists:', debugData.supabase?.session?.exists);
    console.log('User exists:', debugData.supabase?.user?.exists);
    console.log('User ID:', debugData.supabase?.user?.id);
    console.log('Cookie count:', debugData.cookies?.count);
    
    if (debugData.supabase?.user?.exists) {
      console.log('✅ SERVER AUTHENTICATION: SUCCESS');
      
      console.log('\n🔒 Step 2: Test Security Endpoints');
      
      const endpoints = [
        '/api/auth/2fa/status',
        '/api/auth/devices', 
        '/api/auth/sessions'
      ];
      
      let successCount = 0;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'include'
          });
          const data = await response.json();
          
          if (response.ok) {
            console.log(`✅ ${endpoint}: SUCCESS`);
            console.log(`   Data preview: ${JSON.stringify(data).substring(0, 80)}...`);
            successCount++;
          } else {
            console.log(`❌ ${endpoint}: FAILED (${response.status})`);
            console.log(`   Error: ${data.error}`);
          }
        } catch (err) {
          console.log(`❌ ${endpoint}: ERROR - ${err.message}`);
        }
      }
      
      console.log(`\n📊 Security Endpoints Result: ${successCount}/3 working`);
      
      if (successCount === 3) {
        console.log('🎉 ALL SECURITY FEATURES WORKING!');
        console.log('✅ Authentication is fully functional');
        console.log('🔒 You can now access Security settings');
        
        // Look for security UI elements
        const securityElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return (text.includes('security') || text.includes('account') || text.includes('settings')) &&
                 (el.tagName === 'BUTTON' || el.tagName === 'A');
        });
        
        if (securityElements.length > 0) {
          console.log('🔍 Security UI elements found:');
          securityElements.slice(0, 3).forEach((el, i) => {
            console.log(`  ${i+1}. "${el.textContent.trim()}"`);
          });
        } else {
          console.log('ℹ️ No security UI elements visible - may need to navigate to settings');
        }
        
      } else {
        console.log('⚠️ Some security endpoints still not working');
        console.log('💡 Try waiting another minute and testing again');
      }
      
    } else {
      console.log('❌ SERVER AUTHENTICATION: STILL FAILED');
      console.log('Session error:', debugData.supabase?.session?.error);
      console.log('User error:', debugData.supabase?.user?.error);
      console.log('💡 Try refreshing the page - there might be a session sync issue');
    }
    
  } catch (err) {
    console.error('❌ Verification failed:', err);
  }
};

verifyLoginSuccess();