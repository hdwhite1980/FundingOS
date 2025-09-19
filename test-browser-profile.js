// Browser-based test for user profile and analysis functionality
// Run this in browser developer tools console when logged into FundingOS

console.log('🧪 Testing User Profile and Analysis in Browser');

const testUserProfileAnalysis = async () => {
  try {
    // Get current user from auth context
    let userId = null;
    
    // Try to get from Supabase session
    if (window.supabase) {
      const { data: session } = await window.supabase.auth.getSession();
      if (session?.session?.user) {
        userId = session.session.user.id;
        console.log('✅ Got user ID from Supabase:', userId);
      }
    }
    
    if (!userId) {
      console.error('❌ Could not find user ID. Make sure you are logged in.');
      return;
    }
    
    // Test user profile endpoint
    console.log('🔍 Testing user profile endpoint...');
    
    const profileResponse = await fetch(`/api/user/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📥 Profile response status:', profileResponse.status);
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('📋 User profile:', {
        has_profile: !!profileData.profile,
        organization_type: profileData.profile?.organization_type,
        organization_name: profileData.profile?.organization_name,
        setup_completed: profileData.profile?.setup_completed
      });
    } else {
      const errorText = await profileResponse.text();
      console.error('❌ Profile request failed:', errorText);
    }
    
    // Test analysis with debug message
    console.log('🔍 Testing analysis functionality...');
    
    const analysisMessage = "I want to analyze opportunities";
    console.log('📤 Sending analysis request:', analysisMessage);
    
    const analysisResponse = await fetch('/api/ai/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        message: analysisMessage,
        projects: [{
          id: 'test-project',
          name: 'Test Project',
          project_type: 'community_development',
          funding_needed: 50000,
          description: 'A test project for analysis'
        }],
        opportunities: [{
          id: 'test-opportunity',
          title: 'Test Grant',
          organization_types: ['nonprofit', 'for_profit'],
          amount_min: 25000,
          amount_max: 100000,
          deadline_date: '2025-12-31'
        }]
      })
    });
    
    console.log('📥 Analysis response status:', analysisResponse.status);
    console.log('📥 Analysis response headers:', Object.fromEntries(analysisResponse.headers.entries()));
    
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      console.log('📋 Analysis response:', analysisData.message?.substring(0, 400) + '...');
      
      if (analysisData.message && analysisData.message.includes('analysis')) {
        console.log('✅ SUCCESS: Analysis functionality working!');
      } else {
        console.log('❓ PARTIAL: Got response but may not be full analysis');
      }
    } else {
      const errorText = await analysisResponse.text();
      console.error('❌ Analysis request failed:', analysisResponse.status, errorText);
      
      // Check if it's a 500 error (our main issue)
      if (analysisResponse.status === 500) {
        console.error('💥 SERVER ERROR: This is the 500 error we were trying to fix');
        try {
          const errorData = JSON.parse(errorText);
          console.error('Error details:', errorData);
        } catch (e) {
          console.error('Raw error:', errorText);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Test just the endpoint without projects/opportunities
const testBasicAgent = async () => {
  try {
    let userId = null;
    
    if (window.supabase) {
      const { data: session } = await window.supabase.auth.getSession();
      if (session?.session?.user) {
        userId = session.session.user.id;
      }
    }
    
    if (!userId) {
      console.error('❌ No user ID found');
      return;
    }
    
    console.log('🔍 Testing basic agent chat...');
    
    const response = await fetch('/api/ai/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        message: "hello",
        projects: [],
        opportunities: []
      })
    });
    
    console.log('📥 Basic response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Basic agent chat working');
    } else {
      const errorText = await response.text();
      console.error('❌ Basic agent chat failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Basic test failed:', error);
  }
};

// Make functions available globally
window.testUserProfileAnalysis = testUserProfileAnalysis;
window.testBasicAgent = testBasicAgent;

console.log('=== User Profile Analysis Test ===');
console.log('Run: testUserProfileAnalysis() - Full test with profile check and analysis');
console.log('Run: testBasicAgent() - Basic agent chat test');
console.log('==================================');