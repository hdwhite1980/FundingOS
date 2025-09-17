// Test the grants.gov sync endpoint to see if RLS issue is fixed
async function testGrantsGovSync() {
  console.log('Testing Grants.gov sync endpoint...')
  
  try {
    const response = await fetch('http://localhost:3000/api/sync/grants-gov', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)
    
    const data = await response.json()
    console.log('Response data:', JSON.stringify(data, null, 2))
    
    if (data.success) {
      console.log('\n✅ Sync completed successfully!')
      console.log(`Imported: ${data.imported} opportunities`)
    } else {
      console.log('\n❌ Sync failed:', data.error)
      if (data.details) {
        console.log('Details:', data.details)
      }
    }
    
  } catch (error) {
    console.error('Test error:', error.message)
  }
}

console.log('Make sure your development server is running at http://localhost:3000')
console.log('Then run: node test-grants-sync.js')
console.log('')

// Only run if called directly
if (require.main === module) {
  testGrantsGovSync()
}