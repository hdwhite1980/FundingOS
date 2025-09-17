// Robust User ID Helper - run this in browser console first
console.log('🔧 Robust User ID Helper');

const getUserIdFromAnySource = () => {
  console.log('=== CHECKING ALL AUTH SOURCES ===');
  
  let userId = null;
  let source = null;
  
  // Check localStorage sources
  const authSources = [
    'sb-supabase-auth-token',
    'supabase.auth.token', 
    'sb-auth-token',
    'sb-localhost-auth-token'  // Common localhost pattern
  ];
  
  for (const key of authSources) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.user?.id) {
          userId = parsed.user.id;
          source = key;
          console.log(`✅ Found user ID in ${key}: ${userId}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Could not parse ${key}:`, e.message);
      }
    }
  }
  
  // Check all localStorage keys for anything auth-related
  if (!userId) {
    console.log('\n🔍 Checking all localStorage keys for auth data...');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.includes('auth') || key.includes('supabase')) {
        console.log(`Found key: ${key}`);
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.user?.id) {
            userId = data.user.id;
            source = key;
            console.log(`✅ Found user ID in ${key}: ${userId}`);
            break;
          }
        } catch (e) {
          // Not JSON, skip
        }
      }
    }
  }
  
  if (userId) {
    console.log(`\n🎯 USER ID FOUND: ${userId}`);
    console.log(`📍 Source: ${source}`);
    
    // Store this for easy access
    window.FUNDING_OS_USER_ID = userId;
    console.log('💾 Stored as window.FUNDING_OS_USER_ID for easy access');
    
    return { userId, source };
  } else {
    console.log('\n❌ NO USER ID FOUND IN ANY SOURCE');
    console.log('💡 Try logging out and logging back in');
    return null;
  }
};

// Run the helper
const userResult = getUserIdFromAnySource();

// Test the 2FA setup with the found user ID
if (userResult) {
  console.log('\n🧪 Testing 2FA setup with found user ID...');
  
  const testSetup = async () => {
    try {
      const response = await fetch('/api/auth/2fa/setup-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userResult.userId })
      });
      
      console.log(`Setup test status: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ 2FA setup would work with this user ID!');
        const data = await response.json();
        console.log('Preview:', JSON.stringify(data).substring(0, 100) + '...');
      } else {
        const errorData = await response.json();
        console.log('❌ 2FA setup failed:', errorData.error);
        console.log('Debug:', errorData.debug);
      }
    } catch (error) {
      console.log('❌ 2FA test error:', error.message);
    }
  };
  
  testSetup();
}