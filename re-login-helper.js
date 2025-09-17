// Re-login Helper - run this in browser console
console.log('🔑 Re-login Helper');

const reLogin = async () => {
  console.log('Current URL:', window.location.href);
  console.log('Looking for login form...');
  
  // Look for login elements
  const emailInput = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="email" i]');
  const passwordInput = document.querySelector('input[type="password"], input[name="password"], input[placeholder*="password" i]');
  const submitButton = document.querySelector('button[type="submit"], input[type="submit"]');
  
  console.log('Email input found:', !!emailInput);
  console.log('Password input found:', !!passwordInput);
  console.log('Submit button found:', !!submitButton);
  
  if (!emailInput || !passwordInput) {
    // Look for auth links or navigation
    const authLinks = Array.from(document.querySelectorAll('a, button')).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('sign') || text.includes('log') || text.includes('auth');
    });
    
    console.log('Auth navigation found:', authLinks.length);
    if (authLinks.length > 0) {
      console.log('Available auth options:');
      authLinks.forEach((link, i) => {
        console.log(`  ${i+1}. "${link.textContent.trim()}"`);
      });
      
      // Auto-click first auth link
      const shouldClick = confirm(`Click "${authLinks[0].textContent.trim()}" to go to login?`);
      if (shouldClick) {
        console.log('Navigating to auth page...');
        authLinks[0].click();
        return;
      }
    } else {
      console.log('❌ No login form or auth links found');
      console.log('💡 Try navigating to the main page or refresh the browser');
      return;
    }
  } else {
    // We have a login form
    console.log('✅ Login form found!');
    
    const useTestCreds = confirm('Fill login form with your email (contact@ahts4me.com)?');
    if (useTestCreds) {
      emailInput.value = 'contact@ahts4me.com';
      passwordInput.value = prompt('Enter your password:') || '';
      
      if (passwordInput.value) {
        // Trigger events
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('✅ Form filled, ready to submit');
        console.log('Click the submit button or press Enter');
        
        // Auto-submit if user wants
        const shouldSubmit = confirm('Submit the login form now?');
        if (shouldSubmit && submitButton) {
          console.log('🚀 Submitting login...');
          submitButton.click();
          
          // Check result after delay
          setTimeout(async () => {
            try {
              const checkAuth = await fetch('/api/auth/debug');
              const authData = await checkAuth.json();
              
              if (authData.supabase?.user?.exists) {
                console.log('🎉 LOGIN SUCCESSFUL!');
                console.log('User:', authData.supabase.user.id);
                
                // Test security endpoints
                const testSecurity = await fetch('/api/auth/2fa/status');
                const securityData = await testSecurity.json();
                console.log('Security endpoints now working:', testSecurity.ok);
                
              } else {
                console.log('❌ Login may have failed');
                console.log('Debug result:', authData);
              }
            } catch (err) {
              console.log('Error checking login result:', err);
            }
          }, 3000);
        }
      } else {
        console.log('No password entered, please fill manually');
      }
    } else {
      console.log('Please fill and submit the form manually');
    }
  }
};

reLogin();