// Fix Auth Cookies - run this in browser console to manually set auth cookies
console.log('🔧 Fix Auth Cookies');

const fixAuthCookies = async () => {
  try {
    // Get the current session from Supabase client
    const { data: session } = await window.supabase?.auth.getSession();
    
    if (session?.session) {
      console.log('✅ Found active session:', {
        userId: session.session.user.id,
        email: session.session.user.email,
        expires_at: new Date(session.session.expires_at * 1000).toISOString()
      });
      
      // Try to manually set the cookies that Supabase would normally set
      const accessToken = session.session.access_token;
      const refreshToken = session.session.refresh_token;
      
      // Set cookies manually (this is what should happen automatically)
      document.cookie = `sb-access-token=${accessToken}; path=/; secure; samesite=lax`;
      document.cookie = `sb-refresh-token=${refreshToken}; path=/; secure; samesite=lax`;
      
      console.log('🍪 Set authentication cookies manually');
      
      // Test the 2FA endpoint now
      const response = await fetch('/api/auth/2fa/status', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log('🧪 Test result after setting cookies:', {
        status: response.status,
        success: response.ok,
        data
      });
      
    } else {
      console.log('❌ No active session found');
      
      // Try to get session from local storage (fallback)
      const keys = Object.keys(localStorage).filter(k => k.includes('supabase'));
      console.log('📦 LocalStorage keys:', keys);
      
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        try {
          const parsed = JSON.parse(value);
          if (parsed.access_token) {
            console.log(`✅ Found token in ${key}:`, {
              access_token: parsed.access_token.substring(0, 50) + '...',
              expires_at: parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : 'unknown'
            });
          }
        } catch (e) {
          // Not JSON, ignore
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error fixing auth cookies:', error);
  }
};

fixAuthCookies();