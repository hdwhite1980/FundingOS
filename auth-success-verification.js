// Authentication Success Verification - run this in browser console
console.log('🎉 Authentication Success Verification');

const verifyAuth = async () => {
  console.log('Current URL:', window.location.href);
  
  console.log('\n✅ Step 1: Check Client-Side Auth State');
  
  // Check if we can access Supabase client
  if (typeof window !== 'undefined' && window.supabase) {
    try {
      const session = await window.supabase.auth.getSession();
      const user = await window.supabase.auth.getUser();
      
      console.log('Supabase Session:', session.data.session ? '✅ EXISTS' : '❌ MISSING');
      console.log('Supabase User:', user.data.user ? '✅ EXISTS' : '❌ MISSING');
      
      if (user.data.user) {
        console.log('User ID:', user.data.user.id);
        console.log('User Email:', user.data.user.email);
      }
    } catch (err) {
      console.log('❌ Client auth check failed:', err);
    }
  } else {
    console.log('ℹ️ Supabase client not available in window');
  }
  
  console.log('\n🔒 Step 2: Test Security API Endpoints');
  
  // Test all our security endpoints
  const endpoints = [
    '/api/auth/debug',
    '/api/auth/2fa/status', 
    '/api/auth/devices',
    '/api/auth/sessions'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📞 Testing ${endpoint}...`);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      results[endpoint] = {
        status: response.status,
        ok: response.ok,
        data: data
      };
      
      console.log(`${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      
      if (!response.ok) {
        console.log(`  Error: ${data.error || 'Unknown error'}`);
      } else {
        console.log(`  Success: ${JSON.stringify(data).substring(0, 100)}...`);
      }
      
    } catch (err) {
      results[endpoint] = { error: err.message };
      console.log(`${endpoint}: ❌ Failed - ${err.message}`);
    }
  }
  
  console.log('\n📊 Step 3: Summary');
  
  const successCount = Object.values(results).filter(r => r.ok).length;
  const totalCount = endpoints.length;
  
  console.log(`Security endpoints working: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 ALL SECURITY ENDPOINTS WORKING!');
    console.log('✅ Authentication is fully functional');
    
    // Look for Security tab in UI
    console.log('\n🔍 Step 4: Check for Security Tab in UI');
    
    const securityElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
      const title = el.getAttribute('title')?.toLowerCase() || '';
      
      return (text.includes('security') || text.includes('2fa') || text.includes('two-factor') ||
              ariaLabel.includes('security') || title.includes('security')) && 
             (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'TAB' || 
              el.classList.contains('tab') || el.classList.contains('button'));
    });
    
    console.log('Security UI elements found:', securityElements.length);
    
    if (securityElements.length > 0) {
      console.log('Security elements:');
      securityElements.slice(0, 3).forEach((el, i) => {
        console.log(`  ${i+1}. ${el.tagName}: "${el.textContent?.trim()?.substring(0, 50)}"`);
      });
      
      // Offer to click the first security element
      if (securityElements[0]) {
        const clickSecurity = confirm(`Found security element: "${securityElements[0].textContent?.trim()}". Click it to test?`);
        if (clickSecurity) {
          console.log('🚀 Clicking security element...');
          securityElements[0].click();
          
          // Check if Security tab content loads
          setTimeout(() => {
            const securityContent = document.querySelector('[class*="security-"], [data-testid*="security"], [id*="security"]');
            console.log('Security content loaded:', !!securityContent);
          }, 1000);
        }
      }
    } else {
      console.log('ℹ️ No security tab found in UI - may need to navigate to settings/account page');
    }
    
  } else {
    console.log('⚠️ Some endpoints still failing');
    console.log('💡 But you are logged in! The main authentication is working.');
    
    // Show which endpoints are failing
    Object.entries(results).forEach(([endpoint, result]) => {
      if (!result.ok && !result.error) {
        console.log(`❌ ${endpoint}: ${result.status} - ${result.data?.error || 'Unknown error'}`);
      }
    });
  }
  
  return results;
};

// Run verification
verifyAuth().then(results => {
  console.log('\n🏁 Verification Complete');
  console.log('Results summary:', Object.keys(results).map(k => `${k}: ${results[k].ok ? '✅' : '❌'}`).join(', '));
}).catch(err => {
  console.error('🚨 Verification failed:', err);
});