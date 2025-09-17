// Simple Login Guide - run this in browser console
console.log('🔑 Simple Login Guide');

const loginGuide = () => {
  console.log('You need to log in again since your token expired.');
  console.log('\n=== LOGIN STEPS ===');
  
  // Check what's available on the current page
  const emailInput = document.querySelector('input[type="email"], input[name="email"]');
  const passwordInput = document.querySelector('input[type="password"], input[name="password"]');
  const submitButton = document.querySelector('button[type="submit"], input[type="submit"]');
  
  if (emailInput && passwordInput) {
    console.log('✅ LOGIN FORM FOUND on this page!');
    console.log('\n1. Fill in the form:');
    console.log('   - Email: contact@ahts4me.com');
    console.log('   - Password: [your password]');
    console.log('\n2. Click Submit or press Enter');
    console.log('\n3. After successful login, run this test:');
    console.log(`
// Test after login - copy and paste this
const quickAuthTest = async () => {
  await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
  const response = await fetch('/api/auth/debug');
  const data = await response.json();
  console.log('Auth Status:', data.supabase?.user?.exists ? '✅ SUCCESS' : '❌ STILL FAILED');
  if (data.supabase?.user?.exists) {
    const secTest = await fetch('/api/auth/2fa/status');
    console.log('Security endpoints:', secTest.ok ? '✅ WORKING' : '❌ NOT WORKING');
    if (secTest.ok) console.log('🎉 ALL SYSTEMS GO! Authentication fully working!');
  }
};
quickAuthTest();
    `);
    
    // Auto-fill if user wants
    const autoFill = confirm('Would you like me to auto-fill the login form with contact@ahts4me.com?');
    if (autoFill) {
      emailInput.value = 'contact@ahts4me.com';
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      const password = prompt('Enter your password:');
      if (password) {
        passwordInput.value = password;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('✅ Form filled! Click the submit button or press Enter');
        
        if (confirm('Submit the form now?')) {
          if (submitButton) {
            submitButton.click();
            console.log('🚀 Form submitted! Wait for login to complete...');
          } else {
            console.log('Press Enter to submit the form');
          }
        }
      }
    }
    
  } else {
    // No login form found
    console.log('❌ NO LOGIN FORM found on this page');
    console.log('\n=== NAVIGATION NEEDED ===');
    
    // Look for navigation elements
    const navLinks = Array.from(document.querySelectorAll('a, button')).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('sign') || text.includes('log') || text.includes('auth') || 
             text.includes('login') || text.includes('get started');
    });
    
    if (navLinks.length > 0) {
      console.log('📍 Found these navigation options:');
      navLinks.forEach((link, i) => {
        console.log(`  ${i+1}. "${link.textContent.trim()}"`);
      });
      
      const shouldClick = confirm(`Click "${navLinks[0].textContent.trim()}" to navigate to login?`);
      if (shouldClick) {
        console.log('🔄 Navigating to login page...');
        navLinks[0].click();
      }
    } else {
      console.log('💡 MANUAL STEPS:');
      console.log('1. Look for a "Sign In", "Login", or "Get Started" button/link');
      console.log('2. Click it to navigate to the login page');
      console.log('3. Enter: contact@ahts4me.com and your password');
      console.log('4. Submit and then run the auth test');
    }
  }
};

loginGuide();