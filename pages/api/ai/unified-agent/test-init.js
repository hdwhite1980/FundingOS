// Test initialization endpoint to debug the 500 error

export default async function handler(req, res) {
  try {
    console.log('Testing unified agent initialization...')
    
    // Test 1: Check if environment variables are available
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    console.log('OpenAI API Key available:', hasOpenAI)
    
    // Test 2: Check if we can import the manager
    try {
      const { unifiedAgentManager } = await import('../../../../lib/ai-agent/UnifiedManager')
      console.log('UnifiedManager imported successfully')
      
      // Test 3: Try basic manager functionality
      const systemStatus = await unifiedAgentManager.getSystemStatus()
      console.log('System status:', systemStatus)
      
      res.json({
        success: true,
        tests: {
          openaiKey: hasOpenAI,
          managerImport: true,
          systemStatus: systemStatus
        }
      })
      
    } catch (importError) {
      console.error('Import error:', importError)
      res.status(500).json({
        error: 'Import failed',
        details: importError.message,
        stack: importError.stack
      })
    }
    
  } catch (error) {
    console.error('Test error:', error)
    res.status(500).json({
      error: error.message,
      stack: error.stack
    })
  }
}