// Simple test to verify EIN/tax_id lookup logic
function testEINLookupLogic() {
  console.log('\n🧪 Testing EIN/tax_id lookup logic...\n')
  
  // Mock profile and company settings with tax_id (as you mentioned)
  const mockProfile = {
    full_name: 'John Doe',
    organization_name: 'Test Organization',
    tax_id: '12-3456789', // EIN stored as tax_id
    ein: null // No ein field set
  }
  
  const mockCompanySettings = {
    organization_name: 'Test Organization',
    tax_id: '98-7654321', // Different tax_id in company settings
    ein: null // No ein field set
  }
  
  // Test the logic from contextBuilder (checking both fields)
  const ein = mockProfile.ein || mockProfile.tax_id || mockCompanySettings.ein || mockCompanySettings.tax_id
  
  console.log('📊 Test Data:')
  console.log(`   Profile EIN: ${mockProfile.ein || 'Not set'}`)
  console.log(`   Profile Tax ID: ${mockProfile.tax_id || 'Not set'}`)
  console.log(`   Company EIN: ${mockCompanySettings.ein || 'Not set'}`)
  console.log(`   Company Tax ID: ${mockCompanySettings.tax_id || 'Not set'}`)
  
  console.log('\n✅ Lookup Result:')
  console.log(`   Selected EIN/Tax ID: ${ein}`)
  console.log(`   Source: ${mockProfile.ein ? 'Profile EIN' : mockProfile.tax_id ? 'Profile Tax ID' : mockCompanySettings.ein ? 'Company EIN' : 'Company Tax ID'}`)
  
  // Test intent classification regex
  const testQueries = [
    "What's my EIN?",
    "Show me my EIN", 
    "What is my tax ID?",
    "My ein",
    "Tax ID lookup",
    "What's my organization's EIN?",
    "whats my ein"
  ]
  
  console.log('\n🎯 Intent Classification Test:')
  const einRegex = /ein|tax.?id|employer.?id|federal.?id|what.*my.*ein|what.*ein|show.*ein|my.*ein/i
  
  testQueries.forEach(query => {
    const matches = einRegex.test(query)
    console.log(`   "${query}" → ${matches ? '✅ ein_lookup' : '❌ no match'}`)
  })
  
  // Test EIN response building
  const orgName = mockProfile.organization_name || 'your organization'
  
  console.log('\n📋 Sample EIN Response:')
  const response = `📋 **EIN (Employer Identification Number)** is a unique 9-digit federal tax identification number assigned by the IRS to businesses operating in the United States.

${ein ? `✅ ${orgName} EIN/Tax ID: **${ein}**` : `❌ No EIN/Tax ID found for ${orgName}`}

💡 **Your EIN is used for:**
- Federal tax filings and reporting
- Opening business bank accounts  
- Applying for business licenses
- **Grant applications and federal funding**
- Payroll processing (if you have employees)

${ein ? '🤖 I can use this EIN to automatically prefill grant applications and funding forms for you.' : '📝 Add your EIN in your profile settings to enable automatic form prefilling.'}`

  console.log(response)
}

// Run the test
testEINLookupLogic()