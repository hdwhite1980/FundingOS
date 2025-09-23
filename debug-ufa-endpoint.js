#!/usr/bin/env node

// Load environment variables first
require('dotenv').config({ path: '.env.development' })

// Debug script to test UFA endpoint locally
// This will help identify the 400 error source

async function debugUFAEndpoint() {
  console.log('🔍 Debugging UFA endpoint...')
  
  try {
    // Test 1: Import the main service
    console.log('📦 Testing service imports...')
    const { runExpertFundingAnalysisForTenant } = require('./services/ufaWithSBAIntelligence')
    console.log('✅ Service imports successful')
    
    // Test 2: Check environment variables
    console.log('\n🔧 Checking environment variables...')
    const requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ENABLE_SBA_INTELLIGENCE'
    ]
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar]
      if (value) {
        console.log(`✅ ${envVar}: ${envVar.includes('KEY') ? '[HIDDEN]' : value}`)
      } else {
        console.log(`⚠️  ${envVar}: NOT SET`)
      }
    }
    
    // Test 3: Test the service with a sample user ID
    console.log('\n🚀 Testing UFA service with sample data...')
    
    // Use a test tenant ID
    const testTenantId = 'test-user-debug'
    
    try {
      const result = await runExpertFundingAnalysisForTenant(testTenantId)
      console.log('✅ UFA service executed successfully')
      console.log('📊 Result summary:', {
        success: result.success,
        tenantId: result.tenantId,
        hasAnalysisData: !!result.analysisData,
        hasSBAIntelligence: !!result.analysisData?.sbaIntelligence,
        error: result.error
      })
      
      if (result.error) {
        console.error('❌ UFA service returned error:', result.error)
      }
      
    } catch (serviceError) {
      console.error('❌ UFA service threw error:', serviceError.message)
      console.error('Stack trace:', serviceError.stack)
    }
    
    // Test 4: Test database connection
    console.log('\n🗄️ Testing database connection...')
    try {
      const { createClient } = require('@supabase/supabase-js')
      const supabaseUrl = process.env.SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        
        // Test a simple query
        const { data, error } = await supabase
          .from('user_profiles')
          .select('user_id')
          .limit(1)
        
        if (error) {
          console.error('❌ Database connection failed:', error.message)
        } else {
          console.log('✅ Database connection successful')
          console.log('📊 Found user profiles:', data?.length || 0)
        }
      } else {
        console.log('⚠️  Database not configured - some features will be limited')
      }
    } catch (dbError) {
      console.error('❌ Database test error:', dbError.message)
    }
    
  } catch (importError) {
    console.error('❌ Failed to import services:', importError.message)
    console.error('Stack trace:', importError.stack)
  }
}

// Run the debug
debugUFAEndpoint().then(() => {
  console.log('\n🏁 Debug complete')
  process.exit(0)
}).catch(error => {
  console.error('\n💥 Debug failed:', error)
  process.exit(1)
})