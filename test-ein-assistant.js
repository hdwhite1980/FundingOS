const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wgfjdejjvjhdgaovfvrk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnZmpkZWpqdmpoZGdhb3ZmdnJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjI4OTU5NSwiZXhwIjoyMDUxODY1NTk1fQ.uv3t-5mjLwuCz4xR0o0-kGKNBT7eGGKYejW2J0JLQSE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEINAssistant() {
  console.log('🔍 Testing EIN Assistant endpoint...\n');
  
  try {
    // Test assistant endpoint with EIN query
    const response = await fetch('http://localhost:3000/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "what is my ein",
        userId: "11111111-1111-1111-1111-111111111111", // test user
        useLLM: false // Use built-in logic
      })
    });
    
    if (!response.ok) {
      console.error('❌ Assistant API error:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Assistant Response:', data.response);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Also test direct contextBuilder
async function testContextBuilder() {
  console.log('\n🔧 Testing contextBuilder directly...\n');
  
  try {
    const { buildContextualResponse } = require('./lib/ai/contextBuilder.js');
    
    // Mock context with test data
    const mockContext = {
      profile: {
        organization_name: 'Test Org',
        tax_id: '12-3456789',
        address_line1: '123 Main St',
        city: 'Test City',
        state: 'CA'
      },
      company_settings: {},
      projects: [],
      opportunities: []
    };
    
    const response = await buildContextualResponse(mockContext, "what is my ein");
    console.log('✅ ContextBuilder Response:', response);
    
  } catch (error) {
    console.error('❌ ContextBuilder error:', error.message);
  }
}

// Run tests
testEINAssistant();
testContextBuilder();