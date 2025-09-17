// Test the complete authentication flow from browser
console.log('🔄 Testing Complete Auth Flow');

const testAuthFlow = async () => {
  console.log('\n🎯 Step 1: Environment Check');
  
  // Check if we're on the right domain
  console.log('Current URL:', window.location.href);
  console.log('Is production domain:', window.location.hostname.includes('.vercel.app') || window.location.hostname.includes('.com'));
  
  // Check if Supabase client is available
  const supabaseAvailable = typeof window !== 'undefined' && window.supabase;
  console.log('Supabase client available:', supabaseAvailable);
  
  console.log('\n🔍 Step 2: Check Current Auth State');
  
  // Test our debug endpoint first
  try {
    const debugResponse = await fetch('/api/auth/debug', {
      method: 'GET',
      credentials: 'include'
    });
    const debugData = await debugResponse.json();
    console.log('Debug endpoint response:', debugData);
    
    if (debugData.supabase?.user?.exists) {
      console.log('✅ Already authenticated! User ID:', debugData.supabase.user.data?.id);
      console.log('📧 User Email:', debugData.supabase.user.data?.email);
      return { success: true, message: 'Already authenticated', user: debugData.supabase.user.data };
    } else {
      console.log('❌ Not authenticated');
      console.log('Session error:', debugData.supabase?.session?.error);
      console.log('User error:', debugData.supabase?.user?.error);
    }
  } catch (err) {
    console.error('Debug endpoint failed:', err);
    return { success: false, message: 'Debug endpoint failed', error: err };
  }
  
  console.log('\n📝 Step 3: Look for Auth Form');
  
  // Look for auth forms on the page
  const emailInputs = document.querySelectorAll('input[type="email"], input[name="email"]');
  const passwordInputs = document.querySelectorAll('input[type="password"], input[name="password"]');
  const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
  
  console.log('Email inputs found:', emailInputs.length);
  console.log('Password inputs found:', passwordInputs.length);
  console.log('Submit buttons found:', submitButtons.length);
  
  if (emailInputs.length === 0 || passwordInputs.length === 0) {
    console.log('❌ No auth form found on this page');
    console.log('💡 Try navigating to a login/signup page first');
    return { success: false, message: 'No auth form found' };
  }
  
  console.log('\n🔐 Step 4: Test Authentication');
  
  // Check if user wants to proceed with test credentials
  const useTestCredentials = confirm('Would you like to test with demo credentials? (test@example.com / password123)');
  
  if (!useTestCredentials) {
    console.log('ℹ️ User chose not to use test credentials');
    console.log('💡 You can manually fill the form and submit it');
    return { success: false, message: 'User chose manual auth' };
  }
  
  // Fill in test credentials
  const emailInput = emailInputs[0];
  const passwordInput = passwordInputs[0];
  
  if (emailInput && passwordInput) {
    emailInput.value = 'test@example.com';
    passwordInput.value = 'password123';
    
    // Dispatch input events to trigger any listeners
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log('✅ Test credentials filled');
    
    // Look for submit button and click it
    const submitButton = submitButtons[0];
    if (submitButton) {
      console.log('🚀 Submitting auth form...');
      submitButton.click();
      
      // Wait a bit and check auth status again
      setTimeout(async () => {
        try {
          const retryResponse = await fetch('/api/auth/debug');
          const retryData = await retryResponse.json();
          
          if (retryData.supabase?.user?.exists) {
            console.log('🎉 Authentication successful!');
            console.log('User:', retryData.supabase.user.data);
            
            // Test other endpoints now
            await testSecurityEndpoints();
          } else {
            console.log('⏳ Authentication still in progress or failed');
            console.log('Auth result:', retryData);
            
            // Check for any error messages on the page
            const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"], [class*="danger"]');
            if (errorElements.length > 0) {
              console.log('⚠️ Error messages found:');
              errorElements.forEach(el => console.log('-', el.textContent?.substring(0, 100)));
            }
          }
        } catch (err) {
          console.error('❌ Auth retry check failed:', err);
        }
      }, 3000);
      
      return { success: true, message: 'Auth form submitted, waiting for result...' };
    } else {
      console.log('❌ No submit button found');
      return { success: false, message: 'No submit button found' };
    }
  }
  
  return { success: false, message: 'Could not fill auth form' };
};

const testSecurityEndpoints = async () => {
  console.log('\n🔒 Testing Security Endpoints');
  
  const endpoints = [
    '/api/auth/2fa/status',
    '/api/auth/devices',
    '/api/auth/sessions'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📞 Testing ${endpoint}...`);
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include'
      });
      const data = await response.json();
      
      console.log(`${endpoint} - Status: ${response.status}`);
      console.log(`${endpoint} - Data:`, data);
      
      if (response.status === 200) {
        console.log(`✅ ${endpoint} working!`);
      } else {
        console.log(`❌ ${endpoint} failed with ${response.status}`);
      }
    } catch (err) {
      console.log(`❌ ${endpoint} error:`, err);
    }
  }
};

// Run the test
testAuthFlow().then(result => {
  console.log('\n🏁 Auth Flow Test Complete');
  console.log('Result:', result);
}).catch(err => {
  console.error('🚨 Auth Flow Test Failed:', err);
});