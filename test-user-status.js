// Test User Status API - run this in browser console
console.log('🧪 Testing User Status API');

const testUserStatus = async () => {
  try {
    // Get user ID from auth context or localStorage
    let userId = null;
    
    // Method 1: Try to get from React auth context (if available)
    if (window.React && window.ReactDOM) {
      console.log('Looking for user ID in React context...');
      // This would work if we had access to the React context
    }
    
    // Method 2: Get from Supabase session
    if (window.supabase) {
      const { data: session } = await window.supabase.auth.getSession();
      if (session?.session?.user) {
        userId = session.session.user.id;
        console.log('✅ Got user ID from Supabase session:', userId);
      }
    }
    
    // Method 3: Fallback to localStorage
    if (!userId) {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase')) {
          try {
            const value = JSON.parse(localStorage.getItem(key));
            if (value?.user?.id) {
              userId = value.user.id;
              console.log('✅ Got user ID from localStorage:', userId);
            }
          } catch (e) {
            // Not JSON
          }
        }
      });
    }
    
    if (!userId) {
      console.log('❌ No user ID found - user must be logged in');
      return;
    }
    
    console.log('🔄 Testing new user status endpoint...');
    
    const response = await fetch('/api/auth/user-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    });
    
    const data = await response.json();
    
    console.log('📊 User Status API Result:', {
      status: response.status,
      success: response.ok,
      data: data
    });
    
    if (response.ok) {
      console.log('🎉 SUCCESS! User status retrieved:', {
        userId: data.user.id,
        twoFactorEnabled: data.twoFactor.enabled,
        sessionsCount: data.sessions.length,
        devicesCount: data.devices.length,
        authMethod: data.authMethod
      });
    } else {
      console.log('❌ FAILED:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

testUserStatus();