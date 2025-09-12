// Test file to debug agent functionality without direct OpenAI imports
import { supabase } from '../supabase.js'

class TestUnifiedAgent {
  constructor(userId) {
    console.log('Creating test agent for user:', userId)
    this.userId = userId
    this.isActive = false
    this.apiBaseUrl = '/api/ai/agent'
  }

  async initialize() {
    console.log('Initializing test agent...')
    
    try {
      // Test database connection
      const { data, error } = await supabase
        .from('agent_status')
        .select('*')
        .eq('user_id', this.userId)
        .limit(1)
      
      if (error && error.code !== 'PGRST116') {
        console.error('Database connection test failed:', error)
        return { success: false, error: error.message }
      }
      
      console.log('✅ Database connection test passed')

      // Test AI API endpoint
      const aiTestResult = await this.testAIEndpoint()
      if (!aiTestResult.success) {
        console.error('AI endpoint test failed:', aiTestResult.error)
        return { success: false, error: 'AI endpoint unavailable' }
      }
      
      console.log('✅ AI endpoint test passed')

      this.isActive = true
      console.log('✅ Test agent initialized successfully')
      
      return {
        success: true,
        message: 'Test agent initialized',
        capabilities: [
          'Database connectivity',
          'AI API integration',
          'Basic agent operations'
        ]
      }
      
    } catch (error) {
      console.error('Test agent initialization failed:', error)
      return { success: false, error: error.message }
    }
  }

  async testAIEndpoint() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: 'connectivity',
          agentType: 'test'
        })
      })

      if (!response.ok) {
        throw new Error(`AI endpoint test failed: ${response.status}`)
      }

      const result = await response.json()
      return { success: true, data: result }
      
    } catch (error) {
      console.error('AI endpoint test error:', error)
      return { success: false, error: error.message }
    }
  }

  async performBasicTests() {
    console.log('Running basic agent tests...')
    
    const tests = []

    // Test 1: Database connectivity
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', this.userId)
        .single()
      
      tests.push({
        name: 'Database Connectivity',
        success: !error,
        error: error?.message
      })
    } catch (error) {
      tests.push({
        name: 'Database Connectivity',
        success: false,
        error: error.message
      })
    }

    // Test 2: AI API availability
    const aiTest = await this.testAIEndpoint()
    tests.push({
      name: 'AI API Availability',
      success: aiTest.success,
      error: aiTest.error
    })

    // Test 3: Basic memory operations
    try {
      this.testMemory = new Map()
      this.testMemory.set('test_key', 'test_value')
      const value = this.testMemory.get('test_key')
      
      tests.push({
        name: 'Memory Operations',
        success: value === 'test_value',
        error: value !== 'test_value' ? 'Memory test failed' : null
      })
    } catch (error) {
      tests.push({
        name: 'Memory Operations',
        success: false,
        error: error.message
      })
    }

    // Test summary
    const successful = tests.filter(t => t.success).length
    const total = tests.length
    
    console.log(`🧪 Test Results: ${successful}/${total} passed`)
    tests.forEach(test => {
      const status = test.success ? '✅' : '❌'
      console.log(`${status} ${test.name}${test.error ? ': ' + test.error : ''}`)
    })

    return {
      summary: `${successful}/${total} tests passed`,
      allPassed: successful === total,
      tests
    }
  }

  getStatus() {
    return {
      userId: this.userId,
      isActive: this.isActive,
      type: 'test_agent',
      apiEndpoint: this.apiBaseUrl,
      initialized: this.isActive
    }
  }
}

export default TestUnifiedAgent
export { TestUnifiedAgent }