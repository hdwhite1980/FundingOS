// Simple test of assistant endpoint
async function testAssistant() {
  try {
    console.log('🔍 Testing Assistant EIN Response...\n');
    
    const response = await fetch('http://localhost:3000/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "what is my ein",
        userId: "11111111-1111-1111-1111-111111111111",
        useLLM: false
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Status:', response.status);
      console.log('✅ Response:', data.response);
      
      // Check if it's returning actual data or generic response
      if (data.response.includes('EIN/Tax ID:') || data.response.includes('not found')) {
        console.log('🎯 SUCCESS: Assistant is using real data!');
      } else {
        console.log('⚠️  WARNING: May still be generic response');
      }
      
    } else {
      console.error('❌ Error:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAssistant();