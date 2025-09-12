// Test file to debug the UnifiedAgent initialization issue
import { supabase } from '../supabase.js'
import OpenAI from 'openai'

class TestUnifiedAgent {
  constructor(userId) {
    console.log('Creating test agent for user:', userId)
    this.userId = userId
    this.isActive = false
    
    // Test basic initialization without complex dependencies
    try {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      console.log('OpenAI client created successfully')
    } catch (error) {
      console.error('OpenAI client creation failed:', error)
      throw error
    }
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
      
      if (error) {
        console.error('Database query failed:', error)
        throw new Error(`Database error: ${error.message}`)
      }
      
      console.log('Database query successful, found records:', data?.length || 0)
      
      // Test basic initialization
      this.isActive = true
      
      return { 
        success: true, 
        message: 'Test agent initialized successfully',
        databaseTest: 'passed'
      }
      
    } catch (error) {
      console.error('Test agent initialization failed:', error)
      throw error
    }
  }
}

export { TestUnifiedAgent }