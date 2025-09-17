// Test Security APIs After Migration
// Run: node test-security-apis-debug.js

const fetch = require('node-fetch');

async function testSecurityAPIs() {
  console.log('🧪 TESTING SECURITY APIS AFTER MIGRATION\n');
  
  const baseUrl = 'http://localhost:3000';
  const endpoints = [
    '/api/auth/2fa/status',
    '/api/auth/sessions', 
    '/api/auth/devices'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`📡 Testing: ${endpoint}`);
    
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Note: This will be unauthorized without cookies, but shows what the API returns
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      const data = await response.text();
      console.log(`   Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🔍 NEXT STEPS:');
  console.log('1. Check if APIs return "not configured" messages');
  console.log('2. If APIs work, the issue is in the React components');
  console.log('3. If APIs fail, the database migration may need verification');
}

testSecurityAPIs().catch(console.error);