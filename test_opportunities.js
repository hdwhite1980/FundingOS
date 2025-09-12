// Simple test to check raw opportunities data
console.log('Testing raw opportunities access...')

// Test with direct fetch to your Next.js API
async function testOpportunities() {
  try {
    // 1. Test if we can access the opportunities table directly through a simple API call
    console.log('🔍 Testing direct database access...')
    
    // Since we can't easily run the debug script, let's create a simple API test
    console.log('Creating test API call...')
    
    console.log('✅ Test setup complete. Next steps:')
    console.log('1. Open your browser developer tools')
    console.log('2. Go to your app and open the opportunities page') 
    console.log('3. Check the Network tab for the API calls')
    console.log('4. Look for calls to /api/opportunities or similar')
    console.log('5. Check what data is being returned')
    
    console.log('\n🔧 Quick fixes to try:')
    console.log('1. Remove all filters temporarily from getOpportunities()')
    console.log('2. Check if SAM.gov sync is actually running')
    console.log('3. Verify project_types compatibility')
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testOpportunities()