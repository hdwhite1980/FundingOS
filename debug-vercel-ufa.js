// debug-vercel-ufa.js
// Debug script optimized for Vercel/Supabase deployment environment

const path = require('path')

// Load environment variables (Vercel style)
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

console.log('🔧 Vercel/Supabase UFA Endpoint Debug')
console.log('=====================================\n')

async function debugVercelUFAEndpoint() {
  console.log('1️⃣ Environment Variable Check:')
  
  // Check Supabase environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'SENDGRID_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY'
  ]
  
  let missingVars = []
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar]
    if (value) {
      const maskedValue = envVar.includes('KEY') || envVar.includes('SECRET') 
        ? `${value.substring(0, 8)}...` 
        : value
      console.log(`   ✅ ${envVar}: ${maskedValue}`)
    } else {
      console.log(`   ❌ ${envVar}: MISSING`)
      missingVars.push(envVar)
    }
  })
  
  if (missingVars.length > 0) {
    console.log(`\n⚠️  Missing environment variables: ${missingVars.join(', ')}`)
    console.log('   Add these to your Vercel dashboard under Settings > Environment Variables')
    return
  }
  
  console.log('\n2️⃣ Supabase Connection Test:')
  try {
    const { createClient } = require('@supabase/supabase-js')
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Test database connection
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
    
    if (error) {
      console.log(`   ❌ Supabase connection failed: ${error.message}`)
      return
    }
    
    console.log('   ✅ Supabase connection successful')
    
    // Check if required tables exist
    const requiredTables = [
      'user_profiles',
      'opportunities', 
      'ufa_sba_knowledge',
      'ufa_sba_programs'
    ]
    
    console.log('\n3️⃣ Database Schema Check:')
    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (error) {
          console.log(`   ⚠️  Table '${table}': ${error.message}`)
        } else {
          console.log(`   ✅ Table '${table}': Available`)
        }
      } catch (err) {
        console.log(`   ❌ Table '${table}': Error checking - ${err.message}`)
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Supabase setup error: ${error.message}`)
    return
  }
  
  console.log('\n4️⃣ UFA Service Loading Test:')
  try {
    // Test loading the UFA service (same way the API route does)
    console.log('   Loading UFA service...')
    
    const { runExpertFundingAnalysisForTenant } = require('./services/ufaWithSBAIntelligence')
    console.log('   ✅ UFA service loaded successfully')
    
    // Test SBA integration service
    console.log('   Loading SBA integration service...')
    const { SBABusinessGuideIntegrator } = require('./services/sbaBusinessGuideIntegration')
    console.log('   ✅ SBA integration service loaded successfully')
    
  } catch (error) {
    console.log(`   ❌ Service loading failed: ${error.message}`)
    console.log(`   Stack: ${error.stack}`)
    return
  }
  
  console.log('\n5️⃣ SBA Integration Test (Limited for Vercel):')
  try {
    const { SBABusinessGuideIntegrator } = require('./services/sbaBusinessGuideIntegration')
    const integrator = new SBABusinessGuideIntegrator()
    
    // Test a lightweight SBA operation that won't hit Vercel timeouts
    console.log('   Testing SBA fallback content generation...')
    
    const fallbackContent = await integrator.getFallbackContent(
      '/fund-your-business',
      'Fund Your Business'
    )
    
    if (fallbackContent && fallbackContent.length > 0) {
      console.log('   ✅ SBA fallback content generated successfully')
      console.log(`   📊 Generated ${fallbackContent.length} content items`)
    } else {
      console.log('   ⚠️  SBA fallback content generation returned no results')
    }
    
  } catch (error) {
    console.log(`   ❌ SBA integration test failed: ${error.message}`)
  }
  
  console.log('\n6️⃣ Mock UFA Run Test:')
  try {
    // Create a test user ID for validation
    const testUserId = 'test-user-' + Date.now()
    
    console.log(`   Testing UFA analysis with mock user: ${testUserId}`)
    
    // Test the service directly (as the API route would)
    const { runExpertFundingAnalysisForTenant } = require('./services/ufaWithSBAIntelligence')
    
    // Note: This might fail with "user not found" but should test the service loading
    try {
      await runExpertFundingAnalysisForTenant(testUserId)
      console.log('   ✅ UFA service executed successfully')
    } catch (serviceError) {
      if (serviceError.message.includes('User profile not found') || 
          serviceError.message.includes('No user found')) {
        console.log('   ✅ UFA service loaded correctly (expected user not found error)')
      } else {
        console.log(`   ⚠️  UFA service error: ${serviceError.message}`)
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Mock UFA run failed: ${error.message}`)
  }
  
  console.log('\n7️⃣ Vercel Function Optimization Check:')
  
  // Check function configuration from vercel.json
  const vercelConfigPath = path.join(__dirname, 'vercel.json')
  try {
    const vercelConfig = require(vercelConfigPath)
    const ufaFunctionConfig = vercelConfig.functions?.['pages/api/ufa/run.js'] || 
                              vercelConfig.functions?.['app/api/ufa/run/route.ts']
    
    if (ufaFunctionConfig) {
      console.log(`   ✅ UFA function configured with ${ufaFunctionConfig.maxDuration}s timeout`)
      
      if (ufaFunctionConfig.maxDuration < 120) {
        console.log('   ⚠️  Consider increasing maxDuration for complex SBA scraping operations')
      }
    } else {
      console.log('   ⚠️  No specific function configuration found for UFA endpoint')
    }
    
    // Check cron job configuration
    const ufaCron = vercelConfig.crons?.find(cron => cron.path === '/api/ufa/run')
    if (ufaCron) {
      console.log(`   ✅ UFA cron job scheduled: ${ufaCron.schedule}`)
    }
    
  } catch (error) {
    console.log('   ⚠️  Could not read vercel.json configuration')
  }
  
  console.log('\n8️⃣ Next.js API Route Test:')
  
  // Test the actual API route structure
  const apiRoutePath = path.join(__dirname, 'app', 'api', 'ufa', 'run', 'route.ts')
  const fs = require('fs')
  
  if (fs.existsSync(apiRoutePath)) {
    console.log('   ✅ API route file exists at correct path')
    
    // Check if the route properly handles both GET and POST
    const routeContent = fs.readFileSync(apiRoutePath, 'utf8')
    
    if (routeContent.includes('export async function GET') && 
        routeContent.includes('export async function POST')) {
      console.log('   ✅ Route handles both GET and POST methods')
    } else {
      console.log('   ⚠️  Route may be missing GET or POST handler')
    }
    
    if (routeContent.includes('userId')) {
      console.log('   ✅ Route checks for userId parameter')
    }
    
  } else {
    console.log('   ❌ API route file not found at expected path')
  }
  
  console.log('\n🎯 Summary & Recommendations:')
  console.log('================================')
  
  console.log('✅ For Vercel deployment:')
  console.log('   • Set environment variables in Vercel dashboard')
  console.log('   • Use NEXT_PUBLIC_ prefix for client-side variables')
  console.log('   • Monitor function execution time (current limit: 120s)')
  
  console.log('\n✅ For Supabase integration:')
  console.log('   • Use SERVICE_ROLE_KEY for server-side operations')
  console.log('   • Ensure database tables exist and have proper RLS policies')
  console.log('   • Consider connection pooling for high-frequency operations')
  
  console.log('\n✅ For SBA integration:')
  console.log('   • Use fallback content to handle scraping failures')
  console.log('   • Store scraped data in Supabase for persistence')
  console.log('   • Consider running heavy scraping operations via cron jobs')
  
  console.log('\n🔄 Next Steps:')
  console.log('   1. Deploy to Vercel and test /api/ufa/run endpoint')
  console.log('   2. Monitor function execution times in Vercel dashboard')
  console.log('   3. Set up Supabase tables if any are missing')
  console.log('   4. Test SBA knowledge base initialization')
  
}

// Run the debug
debugVercelUFAEndpoint().catch(error => {
  console.error('❌ Debug script failed:', error)
  process.exit(1)
})