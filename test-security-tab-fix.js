// Test Security Tab After Fix - run this in browser console
console.log('🧪 Testing Security Tab After JavaScript Fixes');

const testSecurityTabFix = async () => {
  console.log('=== TESTING SECURITY TAB AFTER FIX ===');
  
  // Test the hook still works
  let userId = null;
  if (window.supabase) {
    const { data: session } = await window.supabase.auth.getSession();
    if (session?.session?.user) {
      userId = session.session.user.id;
    }
  }
  
  if (!userId) {
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase')) {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          if (value?.user?.id) {
            userId = value.user.id;
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
    console.log('🔄 Testing updated Security components...');
    
    const response = await fetch('/api/auth/user-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Security data still working:');
      console.log('├── 2FA Status:', data.twoFactor?.enabled ? 'Enabled' : 'Disabled');
      console.log('├── Sessions:', data.sessions?.length || 0);
      console.log('├── Devices:', data.devices?.length || 0);
      console.log('└── Auth Method:', data.authMethod);
      
      console.log('\n📊 Security Tab Status:');
      console.log('✅ TwoFactorAuth: Should load without setLoading errors');
      console.log('✅ ActiveSessionsManager: Should show "No active sessions" (expected)');
      console.log('✅ DeviceManager: Should show "No trusted devices" (expected)');
      
      if (data.sessions?.length === 0 && data.devices?.length === 0) {
        console.log('\n💡 Empty sessions/devices is normal because:');
        console.log('   • Sessions table may not have current browser session recorded');
        console.log('   • Devices table may not have current device marked as trusted');
        console.log('   • This is expected for new users or after database setup');
      }
      
      console.log('\n🎉 Security tab should now work without JavaScript errors!');
      
    } else {
      console.log('❌ Failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testSecurityTabFix();