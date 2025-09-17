// Simple Login Helper - paste this in browser console
console.log('🔑 Simple Login Helper');

const loginHelper = async () => {
  console.log('Current page:', window.location.href);
  
  // Look for auth elements more carefully
  const emailInput = document.querySelector('input[type="email"], input[name="email"], input[placeholder*="email" i]');
  const passwordInput = document.querySelector('input[type="password"], input[name="password"], input[placeholder*="password" i]');
  const submitButton = document.querySelector('button[type="submit"], input[type="submit"], button:contains("Sign"), button:contains("Log")');
  
  console.log('Found elements:');
  console.log('- Email input:', !!emailInput, emailInput?.placeholder || emailInput?.name || 'no placeholder');
  console.log('- Password input:', !!passwordInput, passwordInput?.placeholder || passwordInput?.name || 'no placeholder');
  console.log('- Submit button:', !!submitButton, submitButton?.textContent?.trim() || 'no text');
  
  // If we don't have login form, check what we do have
  if (!emailInput || !passwordInput) {
    console.log('\n🔍 Looking for other page elements...');
    
    const allInputs = document.querySelectorAll('input');
    const allButtons = document.querySelectorAll('button');
    const allForms = document.querySelectorAll('form');
    
    console.log('Page has:');
    console.log('- Total inputs:', allInputs.length);
    console.log('- Total buttons:', allButtons.length);
    console.log('- Total forms:', allForms.length);
    
    if (allInputs.length > 0) {
      console.log('Input details:');
      allInputs.forEach((input, i) => {
        console.log(`  ${i+1}. Type: ${input.type}, Name: ${input.name}, Placeholder: ${input.placeholder}`);
      });
    }
    
    if (allButtons.length > 0) {
      console.log('Button details:');
      allButtons.forEach((btn, i) => {
        if (btn.textContent?.trim()) {
          console.log(`  ${i+1}. Text: "${btn.textContent.trim()}"`);
        }
      });
    }
    
    // Check for navigation or links to auth pages
    const authLinks = Array.from(document.querySelectorAll('a, button')).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('sign') || text.includes('log') || text.includes('auth') || 
             text.includes('login') || text.includes('register');
    });
    
    if (authLinks.length > 0) {
      console.log('\n🔗 Found potential auth links:');
      authLinks.forEach((link, i) => {
        console.log(`  ${i+1}. "${link.textContent.trim()}" - ${link.tagName} ${link.href ? `(${link.href})` : ''}`);
      });
      
      console.log('💡 Try clicking one of these links to get to the login page');
      
      // Auto-click the first auth link if user wants
      if (authLinks.length > 0) {
        const autoClick = confirm(`Would you like me to click "${authLinks[0].textContent.trim()}" to go to the auth page?`);
        if (autoClick) {
          console.log('🚀 Clicking auth link...');
          authLinks[0].click();
          return { success: true, message: 'Navigated to auth page' };
        }
      }
    } else {
      console.log('❌ No auth form or auth links found on this page');
      console.log('💡 You might need to navigate to the main site or a different URL');
    }
    
    return { success: false, message: 'No auth form found' };
  }
  
  // If we have the form, offer to help login
  console.log('\n✅ Auth form found!');
  console.log('💡 You can either:');
  console.log('  1. Fill out the form manually');
  console.log('  2. Let me help with test credentials');
  
  const useHelper = confirm('Would you like me to help you fill and submit the login form with test credentials?');
  
  if (useHelper) {
    // Fill test credentials
    const testEmail = 'test@example.com';
    const testPassword = 'password123';
    
    console.log('📝 Filling form with test credentials...');
    emailInput.value = testEmail;
    passwordInput.value = testPassword;
    
    // Trigger events
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('✅ Form filled');
    
    // Submit
    if (submitButton) {
      console.log('🚀 Submitting form...');
      submitButton.click();
      
      // Check result after a delay
      setTimeout(async () => {
        console.log('⏳ Checking auth result...');
        try {
          const authCheck = await fetch('/api/auth/debug');
          const authData = await authCheck.json();
          
          if (authData.supabase?.user?.exists) {
            console.log('🎉 LOGIN SUCCESSFUL!');
            console.log('User:', authData.supabase.user.data?.email);
            
            // Test security endpoints
            console.log('🔒 Testing security endpoints...');
            const endpoints = ['/api/auth/2fa/status', '/api/auth/devices', '/api/auth/sessions'];
            
            for (const endpoint of endpoints) {
              try {
                const response = await fetch(endpoint);
                const data = await response.json();
                console.log(`${endpoint}: ${response.status} - ${response.ok ? '✅' : '❌'}`);
                if (!response.ok) console.log(`  Error: ${data.error}`);
              } catch (err) {
                console.log(`${endpoint}: ❌ Failed - ${err.message}`);
              }
            }
            
          } else {
            console.log('❌ Login failed or still processing');
            console.log('Auth response:', authData);
            
            // Look for error messages
            const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"], [role="alert"]');
            if (errorElements.length > 0) {
              console.log('Error messages on page:');
              errorElements.forEach(el => {
                if (el.textContent?.trim()) {
                  console.log(`  - ${el.textContent.trim()}`);
                }
              });
            }
          }
        } catch (err) {
          console.log('❌ Auth check failed:', err);
        }
      }, 3000);
      
      return { success: true, message: 'Form submitted, checking result...' };
    } else {
      console.log('❌ Could not find submit button to click');
      console.log('💡 Try pressing Enter or manually clicking the submit button');
      return { success: false, message: 'No submit button found' };
    }
  } else {
    console.log('ℹ️ Manual login - fill out the form and submit it yourself');
    return { success: false, message: 'User chose manual login' };
  }
};

// Run the helper
loginHelper().then(result => {
  console.log('\n🏁 Login Helper Complete:', result);
}).catch(err => {
  console.error('🚨 Login Helper Failed:', err);
});