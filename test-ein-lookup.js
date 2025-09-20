const contextBuilder = require('./lib/ai/contextBuilder')

async function testEINLookup() {
  console.log('\n🧪 Testing EIN lookup with sample data...\n')
  
  // Create mock context with tax_id (as you mentioned EIN is stored as tax_id)
  const mockContext = {
    profile: {
      id: 'test-user-123',
      full_name: 'John Doe',
      organization_name: 'Test Organization',
      tax_id: '12-3456789', // EIN stored as tax_id
      organization_type: 'Nonprofit',
      email: 'john@testorg.com'
    },
    companySettings: {
      organization_name: 'Test Organization',
      tax_id: '12-3456789', // EIN stored as tax_id
      organization_type: 'Nonprofit',
      address_line1: '123 Main St',
      city: 'Test City',
      state: 'CA',
      zip_code: '90210'
    },
    projects: [],
    applications: []
  }

  // Test EIN-related queries
  const testQueries = [
    "What's my EIN?",
    "Show me my EIN",
    "What is my tax ID?",
    "My ein",
    "Tax ID lookup",
    "What's my organization's EIN?"
  ]

  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`)
    console.log('─'.repeat(50))
    
    try {
      const response = await contextBuilder.buildResponse(mockContext, query)
      console.log('✅ Response:')
      console.log(response)
    } catch (error) {
      console.error('❌ Error:', error.message)
    }
  }
  
  // Test intent classification
  console.log('\n🎯 Testing intent classification...')
  for (const query of testQueries) {
    const intent = contextBuilder.classifyIntent(query)
    console.log(`"${query}" → ${intent}`)
  }
}

// Run the test
if (require.main === module) {
  testEINLookup()
}