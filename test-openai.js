// Test OpenAI connectivity and aiProviderService

async function testOpenAIConnection() {
  console.log('\n🔑 Testing OpenAI API Configuration...\n')
  
  // Check environment variable
  const openAIKey = process.env.OPENAI_API_KEY
  console.log(`OpenAI API Key: ${openAIKey ? openAIKey.substring(0, 10) + '...' : 'NOT SET'}`)
  
  if (!openAIKey || openAIKey === 'sk-placeholder') {
    console.log('❌ OpenAI API Key is not configured properly')
    console.log('   Current value:', openAIKey)
    console.log('   Expected: sk-proj-... or sk-...')
    console.log('\n💡 To fix this:')
    console.log('   1. Get your OpenAI API key from https://platform.openai.com/api-keys')
    console.log('   2. Replace OPENAI_API_KEY in .env.development')
    console.log('   3. Restart the development server')
    return
  }
  
  // Test a simple OpenAI request
  try {
    console.log('\n🧪 Testing OpenAI API call...')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Say "OpenAI connection test successful"' }
        ],
        max_tokens: 20
      })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ OpenAI API Test Successful!')
      console.log('   Response:', result.choices[0].message.content)
      console.log('   Model:', result.model)
      console.log('   Usage:', result.usage)
    } else {
      console.log('❌ OpenAI API Test Failed:')
      console.log('   Error:', result.error?.message || 'Unknown error')
      console.log('   Code:', result.error?.code)
    }
  } catch (error) {
    console.log('❌ Failed to test OpenAI API:', error.message)
  }
}

async function testAiProviderService() {
  console.log('\n🤖 Testing aiProviderService...\n')
  
  try {
    console.log('⚠️ Note: Testing via /api/test-ai endpoint instead of direct import')
    
    // Try to test the endpoint instead
    const testResponse = await fetch('http://localhost:3000/api/test-ai', {
      method: 'GET'
    })
    
    if (testResponse.ok) {
      const result = await testResponse.json()
      console.log('✅ AI Provider Test Result:')
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log('❌ AI Provider Test Failed - server not running or endpoint error')
    }
    
  } catch (error) {
    console.log('❌ Could not test aiProviderService:', error.message)
    console.log('   Try running: curl http://localhost:3000/api/test-ai')
  }
}

// Run tests
testOpenAIConnection().then(() => testAiProviderService())