// Comprehensive authentication debug - run this in browser console on your live site
console.log('🔍 Full Authentication Debug');

const fullAuthDebug = async () => {
  console.log('\n1️⃣ Checking current page state...');
  console.log('URL:', window.location.href);
  console.log('Domain:', window.location.hostname);
  
  // Check if we're on the auth page or dashboard
  const authForm = document.querySelector('form[action*="auth"], input[type="email"]');
  const dashboard = document.querySelector('[data-testid="dashboard"], .dashboard');
  
  console.log('Auth form present:', !!authForm);
  console.log('Dashboard present:', !!dashboard);
  
  console.log('\n2️⃣ Checking browser storage...');
  
  // Check all storage methods
  const cookies = document.cookie.split(';').map(c => c.trim());
  const authCookies = cookies.filter(c => c.includes('supabase') || c.includes('auth') || c.includes('sb-'));
  console.log('Auth cookies count:', authCookies.length);
  if (authCookies.length > 0) {
    console.log('Auth cookies:', authCookies.map(c => c.split('=')[0]));
  }
  
  const localStorageKeys = Object.keys(localStorage).filter(k => 
    k.includes('supabase') || k.includes('auth') || k.includes('sb-')
  );
  console.log('LocalStorage auth keys:', localStorageKeys);
  
  // Check session storage too
  const sessionStorageKeys = Object.keys(sessionStorage).filter(k => 
    k.includes('supabase') || k.includes('auth') || k.includes('sb-')
  );
  console.log('SessionStorage auth keys:', sessionStorageKeys);
  
  console.log('\n3️⃣ Testing API endpoints directly...');
  
  // Test debug endpoint
  try {
    const debugResponse = await fetch('/api/auth/debug');
    const debugData = await debugResponse.json();
    
    console.log('Debug response status:', debugResponse.status);
    console.log('Debug data:', debugData);
    
    if (debugData.supabase?.user?.exists) {
      console.log('✅ Server sees user as authenticated');
    } else {
      console.log('❌ Server does NOT see user as authenticated');
      console.log('Session error:', debugData.supabase?.session?.error);
      console.log('User error:', debugData.supabase?.user?.error);
    }
    
  } catch (err) {
    console.log('Debug endpoint failed:', err);
  }
  
  console.log('\n4️⃣ Checking Supabase client state...');
  
  // Try to access the Supabase client if available
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      const session = await window.supabase.auth.getSession();
      const user = await window.supabase.auth.getUser();
      
      console.log('Client session:', session);
      console.log('Client user:', user);
    } catch (err) {
      console.log('Client auth check failed:', err);
    }
  } else {
    console.log('Supabase client not available in window');
  }
  
  console.log('\n5️⃣ Recommendations...');
  
  if (!authCookies.length && !localStorageKeys.length) {
    console.log('🔍 No auth data found - you may need to log in');
    console.log('📝 Try signing up/in with the form on this page');
  } else if (authCookies.length > 0 || localStorageKeys.length > 0) {
    console.log('🔍 Auth data exists but server doesn\'t recognize it');
    console.log('🔄 Try refreshing the page or logging out and back in');
    console.log('🧹 Or clear browser data and try signing up again');
  }
  
  // Check for any error messages on the page
  const errorMessages = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent && (
      el.textContent.includes('error') || 
      el.textContent.includes('failed') || 
      el.textContent.includes('invalid')
    )
  );
  
  if (errorMessages.length > 0) {
    console.log('\n6️⃣ Error messages found on page:');
    errorMessages.slice(0, 5).forEach(el => {
      console.log('-', el.textContent.substring(0, 100));
    });
  }
};

fullAuthDebug();