// Test Fixed 2FA Endpoint - run this after deployment
console.log('🧪 Test Fixed 2FA Endpoint');

const testFixed2FA = async () => {
  console.log('=== TESTING FIXED 2FA SETUP ENDPOINT ===');
  
  // Use the user ID we found
  const userId = '1134a8c4-7dce-4b1f-8b97-247580e16e9c';
  
  try {
    console.log('📞 Testing /api/auth/2fa/setup-new with base32 fix...');
    console.log('User ID:', userId);
    
    const response = await fetch('/api/auth/2fa/setup-new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: userId })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('🎉 SUCCESS! The base32 encoding error is fixed!');
      
      const data = await response.json();
      console.log('✅ 2FA Setup Response:');
      console.log('- Secret length:', data.secret?.length || 'Not provided');
      console.log('- QR Code URL provided:', !!data.qr_code_url);
      console.log('- User email:', data.user?.email || 'Not provided');
      
      if (data.secret) {
        console.log('- Secret preview:', data.secret.substring(0, 8) + '...');
        console.log('- Secret format valid:', /^[A-Z2-7]+$/.test(data.secret));
      }
      
      if (data.qr_code_url) {
        console.log('- QR Code URL preview:', data.qr_code_url.substring(0, 50) + '...');
      }
      
      console.log('\n🔐 You can now:');
      console.log('1. Scan the QR code with Google Authenticator');
      console.log('2. Or manually enter the secret into your authenticator app');
      console.log('3. Then use the verification code to complete 2FA setup');
      
    } else {
      console.log('❌ Still failing - checking error details...');
      
      try {
        const errorData = await response.json();
        console.log('Error:', errorData.error);
        console.log('Debug info:', errorData.debug);
      } catch (jsonError) {
        console.log('Could not parse error response as JSON');
        const text = await response.text();
        console.log('Error response:', text.substring(0, 200) + '...');
      }
    }
    
  } catch (networkError) {
    console.log('❌ Network error:', networkError.message);
  }
};

// Test immediately and also in 2 minutes
testFixed2FA();

setTimeout(() => {
  console.log('\n⏰ Running delayed test (2 minutes later)...');
  testFixed2FA();
}, 120000);

console.log('💡 Test will also run again automatically in 2 minutes');