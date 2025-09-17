// Test New 2FA Endpoints - run this in browser console
console.log('🧪 Testing New 2FA Endpoints');

const testNew2FAEndpoints = async () => {
  console.log('=== TESTING NEW 2FA ENDPOINTS ===');
  
  // Get user ID
  let userId = null;
  if (window.supabase) {
    const { data: session } = await window.supabase.auth.getSession();
    if (session?.session?.user) {
      userId = session.session.user.id;
      console.log('✅ Got user ID:', userId);
    }
  }
  
  if (!userId) {
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase')) {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          if (value?.user?.id) {
            userId = value.user.id;
            console.log('✅ Got user ID from localStorage:', userId);
          }
        } catch (e) {}
      }
    });
  }
  
  if (!userId) {
    console.log('❌ No user ID - must be logged in');
    return;
  }
  
  // Test the new setup endpoint
  try {
    console.log('\n🔄 Testing /api/auth/2fa/setup-new...');
    
    const response = await fetch('/api/auth/2fa/setup-new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    
    if (response.ok) {
      console.log('🎉 SUCCESS! New 2FA setup endpoint working!');
      console.log('├── Secret generated:', data.secret ? 'YES' : 'NO');
      console.log('├── QR code URL:', data.qr_code_url ? 'YES' : 'NO');
      console.log('└── Auth Method:', data.authMethod);
      
      console.log('\n✅ 2FA setup should now work without 401 errors!');
      console.log('💡 Try clicking "Enable 2FA" again in the Security tab.');
      
    } else {
      console.log('❌ FAILED');
      console.log('Error:', data.error);
      console.log('Debug:', data.debug);
      
      if (response.status === 404) {
        console.log('\n⏳ Deployment might still be in progress...');
        console.log('   Wait 2-3 more minutes and try again.');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.message.includes('fetch')) {
      console.log('\n⏳ Endpoint might not be deployed yet...');
      console.log('   Wait for Vercel deployment to complete.');
    }
  }
};

testNew2FAEndpoints();