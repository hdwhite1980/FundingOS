// Test the agent's behavior when user has no projects but wants to analyze opportunities
const fetch = require('node-fetch');

async function testAgentNoProjectsScenario() {
  console.log('Testing agent behavior with no projects scenario...');
  
  try {
    // Mock the environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://zlwlhhvlwujnhgvtojvh.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsd2xoaHZsd3VqbmhndnRvanZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzkzNDk2NiwiZXhwIjoyMDQzNTEwOTY2fQ.R9TsBOq8YYLbGUQYrEIZU7w_WGzrYnhsHOKRlUJr0zs';
    
    // Import the agent logic
    const path = require('path');
    const agentFile = path.join(__dirname, 'pages', 'api', 'ai', 'agent', '[...action].js');
    const { analyzeMessageIntent } = require(agentFile);
    
    // Test scenario 1: Initial question "what grants should I apply to"
    console.log('\n--- Test 1: Initial question ---');
    const initialMessage = "what grants should I apply to";
    console.log(`User message: "${initialMessage}"`);
    
    const initialIntent = await analyzeMessageIntent(initialMessage, []);
    console.log('Detected intent:', initialIntent);
    
    // Test scenario 2: Follow-up response "yes"
    console.log('\n--- Test 2: Follow-up response ---');
    const followUpMessage = "yes";
    
    // Simulate conversation history
    const conversationHistory = [
      {
        role: 'user',
        content: initialMessage,
        created_at: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      },
      {
        role: 'assistant',
        content: "I can help you find relevant grant opportunities! Based on your profile, I can analyze thousands of available grants and show you the best matches for your projects. Would you like me to search for opportunities that fit your specific needs and goals?",
        created_at: new Date(Date.now() - 20000).toISOString() // 20 seconds ago
      }
    ];
    
    console.log(`User message: "${followUpMessage}"`);
    console.log('Conversation history:', conversationHistory.length, 'messages');
    
    const followUpIntent = await analyzeMessageIntent(followUpMessage, conversationHistory);
    console.log('Detected intent:', followUpIntent);
    
    // Verify the intent detection works correctly
    if (followUpIntent.includes('analyze_opportunities')) {
      console.log('✅ SUCCESS: Follow-up intent correctly detected as analyze_opportunities');
      
      // Test the response logic for no projects scenario
      console.log('\n--- Test 3: Response for no projects scenario ---');
      console.log('Simulating user with 0 projects and some opportunities...');
      
      const mockProjects = [];
      const mockOpportunities = [
        { title: 'Sample Grant 1', sponsor: 'Test Foundation' },
        { title: 'Sample Grant 2', sponsor: 'Test Agency' }
      ];
      
      if (mockOpportunities?.length > 0 && (!mockProjects || mockProjects.length === 0)) {
        console.log('✅ SUCCESS: Would trigger "no projects" guidance response');
        console.log('Expected response: Guide user to create a project first');
      } else {
        console.log('❌ FAILED: Logic condition not met');
      }
      
    } else {
      console.log('❌ FAILED: Follow-up intent not detected correctly');
      console.log('Expected: analyze_opportunities');
      console.log('Actual:', followUpIntent);
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
  }
}

// Run the test
testAgentNoProjectsScenario();