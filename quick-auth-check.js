// Quick auth status check - run this in browser console
console.log('🏥 Quick Auth Health Check');

const quickCheck = async () => {
  console.log('Current page:', window.location.href);
  
  // 1. Check if we're authenticated
  try {
    const authCheck = await fetch('/api/auth/debug');
    const authData = await authCheck.json();
    
    console.log('Auth Status:', authData.supabase?.user?.exists ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED');
    
    if (authData.supabase?.user?.exists) {
      console.log('User ID:', authData.supabase.user.data?.id);
      console.log('Email:', authData.supabase.user.data?.email);
    } else {
      console.log('Session Error:', authData.supabase?.session?.error);
      console.log('User Error:', authData.supabase?.user?.error);
    }
  } catch (err) {
    console.log('❌ Auth check failed:', err);
  }
  
  // 2. Check what page elements we have
  const hasAuthForm = document.querySelector('input[type="email"]') !== null;
  const hasDashboard = document.querySelector('[class*="dashboard"], [data-testid*="dashboard"]') !== null;
  const hasSecurityTab = Array.from(document.querySelectorAll('button, a, span')).some(el => 
    el.textContent && el.textContent.toLowerCase().includes('security')
  );
  
  console.log('Page Elements:');
  console.log('- Auth form present:', hasAuthForm);
  console.log('- Dashboard present:', hasDashboard);
  console.log('- Security tab present:', hasSecurityTab);
  
  // 3. Check browser storage
  const authCookies = document.cookie.split(';').filter(c => c.includes('supabase') || c.includes('auth'));
  const authLocalStorage = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('auth'));
  
  console.log('Browser Storage:');
  console.log('- Auth cookies:', authCookies.length);
  console.log('- Auth localStorage:', authLocalStorage.length);
  
  // 4. Quick recommendation
  if (hasAuthForm && !authCookies.length && !authLocalStorage.length) {
    console.log('💡 RECOMMENDATION: You need to log in using the form on this page');
  } else if (!hasAuthForm && !hasDashboard) {
    console.log('💡 RECOMMENDATION: Navigate to the main site page to access login/dashboard');
  } else if (hasDashboard && (authCookies.length > 0 || authLocalStorage.length > 0)) {
    console.log('💡 RECOMMENDATION: You should be authenticated - try refreshing the page');
  }
};

quickCheck();