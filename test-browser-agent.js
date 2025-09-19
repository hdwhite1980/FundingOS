// Browser-based test script for AI agent contextual follow-up
// Run this in browser developer tools console when logged into FundingOS

console.log('🧪 Testing AI Agent Contextual Follow-up in Browser');

const testAgentFollowUp = async () => {
  try {
    // Get current user from auth context
    let userId = null;
    
    // Try to get from Supabase session (common pattern)
    if (window.supabase) {
      const { data: session } = await window.supabase.auth.getSession();
      if (session?.session?.user) {
        userId = session.session.user.id;
        console.log('✅ Got user ID from Supabase:', userId);
      }
    }
    
    // Fallback: try localStorage
    if (!userId) {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          try {
            const data = JSON.parse(localStorage[key]);
            if (data?.user?.id) {
              userId = data.user.id;
              console.log('✅ Got user ID from localStorage:', userId);
            }
          } catch (e) {
            // ignore parsing errors
          }
        }
      });
    }
    
    if (!userId) {
      console.error('❌ Could not find user ID. Make sure you are logged in.');
      return;
    }
    
    console.log('🔍 Testing agent endpoint with follow-up...');
    
    // First, send a question about grants
    const firstMessage = "what grants should I apply to";
    console.log('📤 Sending first message:', firstMessage);
    
    const firstResponse = await fetch('/api/ai/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        message: firstMessage,
        projects: [], // Empty for now
        opportunities: [] // Empty for now
      })
    });
    
    console.log('📥 First response status:', firstResponse.status);
    
    if (!firstResponse.ok) {
      const errorText = await firstResponse.text();
      console.error('❌ First request failed:', errorText);
      return;
    }
    
    const firstData = await firstResponse.json();
    console.log('📋 First response:', firstData.message?.substring(0, 200) + '...');
    
    // Wait a moment, then send follow-up
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now send "yes" as a follow-up
    const followUpMessage = "yes";
    console.log('📤 Sending follow-up:', followUpMessage);
    
    const followUpResponse = await fetch('/api/ai/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        message: followUpMessage,
        projects: [], // Empty for now
        opportunities: [] // Empty for now
      })
    });
    
    console.log('📥 Follow-up response status:', followUpResponse.status);
    
    if (!followUpResponse.ok) {
      const errorText = await followUpResponse.text();
      console.error('❌ Follow-up request failed:', errorText);
      return;
    }
    
    const followUpData = await followUpResponse.json();
    console.log('📋 Follow-up response:', followUpData.message?.substring(0, 300) + '...');
    
    // Check if the follow-up was interpreted contextually
    const isContextual = followUpData.message && (
      followUpData.message.includes('analysis') ||
      followUpData.message.includes('opportunities') ||
      followUpData.message.includes('grants') ||
      followUpData.message.includes('project')
    );
    
    if (isContextual) {
      console.log('✅ SUCCESS: Follow-up "yes" was interpreted contextually!');
      console.log('🎯 The agent understood the context and provided relevant analysis.');
    } else {
      console.log('❌ ISSUE: Follow-up "yes" was not interpreted contextually.');
      console.log('🔍 Response seems generic rather than grant-focused.');
    }
    
    // Test direct analysis request
    console.log('🔍 Testing direct analysis request...');
    
    const analysisMessage = "analyze opportunities for my projects";
    const analysisResponse = await fetch('/api/ai/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        message: analysisMessage,
        projects: [], // Empty for now
        opportunities: [] // Empty for now
      })
    });
    
    console.log('📥 Analysis response status:', analysisResponse.status);
    
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      console.log('📋 Analysis response:', analysisData.message?.substring(0, 300) + '...');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Instructions for running the test
console.log('=== Browser-based Agent Testing Instructions ===');
console.log('1. Make sure you are logged into FundingOS');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Run: testAgentFollowUp()');
console.log('5. Watch the output to see if follow-up works');
console.log('=============================================');

// Make the function available globally
window.testAgentFollowUp = testAgentFollowUp;

// Auto-run if we detect we're in a browser context
if (typeof window !== 'undefined' && window.location) {
  console.log('🚀 Browser context detected. You can run: testAgentFollowUp()');
  console.log('📍 Current URL:', window.location.href);
}