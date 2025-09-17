// Debug QR Code Display - run this in browser console
console.log('🖼️ Debug QR Code Display');

const debugQRCode = () => {
  console.log('=== CHECKING QR CODE STATE ===');
  
  // Check if the QR code URL is in the DOM
  const qrImg = document.querySelector('img[alt="2FA QR Code"]');
  
  if (qrImg) {
    console.log('✅ Found QR code image element');
    console.log('Current src:', qrImg.src);
    console.log('Image dimensions:', qrImg.width, 'x', qrImg.height);
    console.log('Image loaded:', qrImg.complete);
    console.log('Natural dimensions:', qrImg.naturalWidth, 'x', qrImg.naturalHeight);
    
    // Check if image failed to load
    qrImg.onerror = () => {
      console.log('❌ QR code image failed to load');
    };
    
    qrImg.onload = () => {
      console.log('✅ QR code image loaded successfully');
    };
    
    // If image hasn't loaded, try to reload it
    if (!qrImg.complete) {
      console.log('🔄 Attempting to reload image...');
      const originalSrc = qrImg.src;
      qrImg.src = '';
      qrImg.src = originalSrc;
    }
  } else {
    console.log('❌ No QR code image element found in DOM');
    
    // Check if there's any 2FA setup container
    const setupContainer = document.querySelector('[class*="2fa"], [class*="two-factor"]') || 
                          document.querySelector('h3, h2, h4').find(el => 
                            el.textContent.includes('2FA') || 
                            el.textContent.includes('Two-Factor') ||
                            el.textContent.includes('QR Code')
                          );
    
    if (setupContainer) {
      console.log('✅ Found 2FA container, but no QR image');
    } else {
      console.log('❌ No 2FA setup container found');
    }
  }
  
  // Check React component state if possible
  console.log('\n🔍 Checking component state...');
  console.log('Try opening browser dev tools and check:');
  console.log('1. Network tab - look for QR API requests');
  console.log('2. Console - look for any React component errors');
  console.log('3. Elements tab - inspect the 2FA setup section');
};

debugQRCode();

// Also create a test QR code to verify the API works
console.log('\n🧪 Testing QR code generation...');
const testQRUrl = 'otpauth://totp/FundingOS:contact%40ahts4me.com?secret=VYZT455VD4LEKONE4IHVA6KJE4TCIH7U&issuer=FundingOS';
const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(testQRUrl)}`;

console.log('QR API URL:', qrApiUrl);
console.log('You can test this URL directly in a new tab');

// Test if we can load the QR image directly
const testImg = new Image();
testImg.onload = () => {
  console.log('✅ QR API is working - image loaded successfully');
};
testImg.onerror = () => {
  console.log('❌ QR API failed - image could not load');
};
testImg.src = qrApiUrl;