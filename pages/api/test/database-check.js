// Simple database connection test
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)
    
    if (testError) {
      throw new Error(`Basic connection test failed: ${testError.message}`)
    }
    
    console.log('Basic connection successful')
    
    // Test for new agent tables
    const tables = [
      'agent_status',
      'agent_errors', 
      'agent_conversations',
      'agent_experiences',
      'agent_decision_feedback',
      'agent_notifications',
      'system_metrics'
    ]
    
    const tableStatus = {}
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          tableStatus[table] = { exists: false, error: error.message }
        } else {
          tableStatus[table] = { exists: true, recordCount: data?.length || 0 }
        }
      } catch (err) {
        tableStatus[table] = { exists: false, error: err.message }
      }
    }
    
    res.json({
      success: true,
      basicConnection: 'passed',
      tables: tableStatus
    })
    
  } catch (error) {
    console.error('Database test failed:', error)
    res.status(500).json({
      error: error.message,
      details: 'Database connection test failed'
    })
  }
}