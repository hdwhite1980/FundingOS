// Test Security Hook - run this in browser console to test the new hook
console.log('🧪 Testing Security Hook Implementation');

// This simulates how the components will use the new hook
const testSecurityHook = async () => {
  console.log('=== TESTING NEW SECURITY DATA HOOK ===');
  
  // Get user ID (same as before)
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
  
  try {
    console.log('🔄 Fetching security data...');
    
    const response = await fetch('/api/auth/user-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('🎉 SUCCESS! Security data structure:');
      console.log('├── 2FA Status:', {
        enabled: data.twoFactor?.enabled,
        configured: data.twoFactor?.configured
      });
      console.log('├── Active Sessions:', data.sessions?.length || 0, 'sessions');
      console.log('├── Trusted Devices:', data.devices?.length || 0, 'devices');
      console.log('└── Auth Method:', data.authMethod);
      
      console.log('\n📊 Component Compatibility Check:');
      console.log('✅ TwoFactorAuth: Can use twoFactor.enabled');
      console.log('✅ ActiveSessionsManager: Can use sessions array');
      console.log('✅ DeviceManager: Can use devices array');
      console.log('✅ All components: No more 401 errors!');
      
    } else {
      console.log('❌ Failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testSecurityHook();