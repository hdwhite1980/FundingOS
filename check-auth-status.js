// Authentication status checker - run this in browser console on your live site
console.log('🔍 Authentication Status Check');

const checkAuthStatus = async () => {
  console.log('\n1️⃣ Checking current page and auth state...');
  console.log('Current URL:', window.location.href);
  console.log('Current domain:', window.location.hostname);
  
  // Check cookies
  console.log('\n2️⃣ Checking authentication cookies...');
  const cookies = document.cookie.split(';').map(c => c.trim());
  const authCookies = cookies.filter(cookie => 
    cookie.includes('supabase') || 
    cookie.includes('auth') || 
    cookie.includes('session') ||
    cookie.includes('sb-')
  );
  
  console.log('All cookies count:', cookies.length);
  console.log('Auth-related cookies:', authCookies.length);
  if (authCookies.length > 0) {
    console.log('Auth cookies found:', authCookies.map(c => c.split('=')[0]));
  } else {
    console.log('❌ No auth-related cookies found');
  }
  
  // Check localStorage
  console.log('\n3️⃣ Checking localStorage auth...');
  const localStorageKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('auth') || key.includes('sb-')
  );
  
  if (localStorageKeys.length > 0) {
    console.log('LocalStorage auth keys:', localStorageKeys);
    
    // Check the main auth token
    const mainAuthKey = localStorageKeys.find(key => key.includes('auth-token'));
    if (mainAuthKey) {
      try {
        const authData = JSON.parse(localStorage.getItem(mainAuthKey));
        console.log('Auth token expires:', new Date(authData.expires_at * 1000));
        console.log('Token expired?', new Date(authData.expires_at * 1000) < new Date());
        console.log('User ID:', authData.user?.id);
      } catch (e) {
        console.log('❌ Auth token exists but is invalid');
      }
    }
  } else {
    console.log('❌ No localStorage auth data found');
  }
  
  // Check if there's a login form or auth flow
  console.log('\n4️⃣ Checking page for auth elements...');
  const loginForm = document.querySelector('form[action*="auth"], form[action*="login"], input[type="email"]');
  const loginButton = document.querySelector('button:contains("Sign In"), button:contains("Login"), a[href*="auth"]');
  
  if (loginForm || loginButton) {
    console.log('✅ Login elements found on page - you may need to log in');
  } else {
    console.log('❓ No obvious login elements found');
  }
  
  // Check if user profile/auth info is in page
  console.log('\n5️⃣ Checking for user info in page...');
  const userEmail = document.querySelector('[data-user-email], .user-email');
  const userProfile = document.querySelector('[data-user-profile], .user-profile, .account-settings');
  
  if (userEmail || userProfile) {
    console.log('✅ User profile elements found - you might be logged in locally but not on server');
  } else {
    console.log('❓ No user profile elements found');
  }
  
  console.log('\n🎯 Diagnosis:');
  console.log('Based on the API responses showing no authentication,');
  console.log('you likely need to log in again on the Vercel production site.');
  console.log('The session from local development does not carry over to production.');
};

checkAuthStatus();