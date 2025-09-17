// Debug Response Checker - run this in browser console
console.log('🔍 Debug Response Checker');

const checkDebugResponse = async () => {
  try {
    const response = await fetch('/api/auth/debug', {
      method: 'GET',
      credentials: 'include'
    });
    
    const data = await response.json();
    
    console.log('Debug endpoint full response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    // Check specific fields
    console.log('\nAuth Details:');
    console.log('Session exists:', data.supabase?.session?.exists);
    console.log('User exists:', data.supabase?.user?.exists);
    console.log('User ID:', data.supabase?.session?.userId || data.supabase?.user?.id);
    console.log('Session error:', data.supabase?.session?.error);
    console.log('User error:', data.supabase?.user?.error);
    
    console.log('\nCookie Info:');
    console.log('Cookie count:', data.cookies?.count);
    console.log('Cookie names:', data.cookies?.names);
    
    // If we have user data, try to identify the auth method
    if (data.supabase?.session?.exists) {
      console.log('✅ Standard Supabase auth is working');
      console.log('💡 The issue might be with our custom simpleAuthHelper');
    } else {
      console.log('❌ Even standard Supabase auth is not working');
    }
    
  } catch (err) {
    console.error('Failed to check debug response:', err);
  }
};

checkDebugResponse();