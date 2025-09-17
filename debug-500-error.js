// Debug 2FA Endpoint Server Error - run this to get more details
console.log('🔍 Debug 2FA Endpoint Server Error');

const debug500Error = async () => {
  console.log('=== TESTING 2FA ENDPOINT WITH DETAILED ERROR INFO ===');
  
  // Use the user ID we found
  const userId = '1134a8c4-7dce-4b1f-8b97-247580e16e9c';
  
  try {
    console.log('📞 Testing /api/auth/2fa/setup-new...');
    console.log('User ID:', userId);
    
    const response = await fetch('/api/auth/2fa/setup-new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: userId })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Response headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    // Try to get JSON error details
    try {
      const data = await response.json();
      console.log('Response JSON:', data);
      
      if (data.error) {
        console.log('❌ Error:', data.error);
      }
      if (data.debug) {
        console.log('🔍 Debug info:', data.debug);
      }
    } catch (jsonError) {
      console.log('❌ Could not parse response as JSON');
      
      // Try to get as text
      const textResponse = await fetch('/api/auth/2fa/setup-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userId })
      });
      
      const text = await textResponse.text();
      console.log('Response as text:', text.substring(0, 500) + '...');
    }
    
  } catch (networkError) {
    console.log('❌ Network error:', networkError.message);
  }
  
  console.log('\n💡 Common causes of 500 errors:');
  console.log('1. Database connection issues');
  console.log('2. Missing environment variables (SUPABASE_SERVICE_ROLE_KEY)');
  console.log('3. Database schema issues (user not in user_profiles table)');
  console.log('4. RLS (Row Level Security) policy blocking service role');
  console.log('5. Invalid user ID format');
};

debug500Error();