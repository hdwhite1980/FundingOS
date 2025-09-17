// Test Security APIs in Browser Console WITH AUTH TOKEN
// Copy and paste this into your browser's console while logged in

console.log('🧪 Testing Security APIs with Authentication Token...\n');

// First, get the auth token from Supabase client
async function testWithAuthToken() {
  try {
    // Try to get the current session/token
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      window.location.hostname.includes('vercel.app') 
        ? process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
        : 'https://nqxvtexiojegwolqfgmo.supabase.co', // Replace with your actual URL
      window.location.hostname.includes('vercel.app') 
        ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
        : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xeHZ0ZXhpb2plZ3dvbHFmZ21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3MDkwNDcsImV4cCI6MjA0MDI4NTA0N30.wQV9uCr9lJp7bPU6FRWMwJkBm1ZQgF0GpV-kOqUlZhc' // Replace with your actual anon key
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ No session found - user may not be properly logged in');
      return;
    }
    
    console.log('✅ Found session for user:', session.user.id);
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
    
    // Test APIs with auth token
    const endpoints = [
      '/api/auth/2fa/status',
      '/api/auth/sessions',
      '/api/auth/devices'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { headers });
        const data = await response.json();
        
        console.log(`📡 ${endpoint}:`);
        console.log(`   Status: ${response.status}`);
        console.log('   Response:', data);
        console.log('');
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error setting up test:', error.message);
    
    // Fallback: test without token (like before)
    console.log('\nFalling back to cookie-based auth test...');
    testWithoutToken();
  }
}

function testWithoutToken() {
  // Test 2FA Status
  fetch('/api/auth/2fa/status')
    .then(response => response.json().then(data => ({ status: response.status, data })))
    .then(({ status, data }) => {
      console.log('📡 2FA Status API (cookie-based):');
      console.log(`   Status: ${status}`);
      console.log('   Response:', data);
      console.log('');
    });

  // Test Sessions API  
  fetch('/api/auth/sessions')
    .then(response => response.json().then(data => ({ status: response.status, data })))
    .then(({ status, data }) => {
      console.log('📡 Sessions API (cookie-based):');
      console.log(`   Status: ${status}`);
      console.log('   Response:', data);
      console.log('');
    });
}

// Run the test
testWithAuthToken();