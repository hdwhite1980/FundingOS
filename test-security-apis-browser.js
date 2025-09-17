// Test Security APIs in Browser Console
// Copy and paste this into your browser's console while logged in

console.log('🧪 Testing Security APIs with Authentication...\n');

// Test 2FA Status
fetch('/api/auth/2fa/status')
  .then(response => {
    console.log('📡 2FA Status API:');
    console.log(`   Status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    console.log('   Response:', data);
    console.log('');
  })
  .catch(err => console.log('   Error:', err.message));

// Test Sessions API  
fetch('/api/auth/sessions')
  .then(response => {
    console.log('📡 Sessions API:');
    console.log(`   Status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    console.log('   Response:', data);
    console.log('');
  })
  .catch(err => console.log('   Error:', err.message));

// Test Devices API
fetch('/api/auth/devices')
  .then(response => {
    console.log('📡 Devices API:');
    console.log(`   Status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    console.log('   Response:', data);
    console.log('');
  })
  .catch(err => console.log('   Error:', err.message));