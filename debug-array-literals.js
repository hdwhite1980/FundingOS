// Debug script to test array literal handling
// This will help identify which field is causing the malformed array literal error

export function debugArrayLiteralHandling() {
  console.log('🔍 Testing Array Literal Handling')
  console.log('=================================')
  
  // Test the ensureArray function
  const testCases = [
    'Simple string',
    ['Array', 'of', 'strings'],
    '["JSON", "array", "string"]',
    'Institutions of higher education, including community colleges',
    null,
    undefined,
    '',
    { object: 'value' }
  ]
  
  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}:`)
    console.log(`Input (${typeof testCase}):`, testCase)
    try {
      const result = ensureArray(testCase)
      console.log(`Output:`, result)
      console.log(`✅ Success - Array with ${result.length} items`)
    } catch (error) {
      console.log(`❌ Error:`, error.message)
    }
  })
  
  // Test formatEligibilityCriteria function
  console.log('\n\n🔍 Testing Eligibility Criteria Formatting')
  console.log('==========================================')
  
  const eligibilityTestCases = [
    'Institutions of higher education, including community colleges, that have not received an ATE award in the past seven years',
    ['Small businesses with innovative scientific or technology solutions', 'Must be US-based'],
    null,
    ['Single item array'],
    ''
  ]
  
  eligibilityTestCases.forEach((testCase, index) => {
    console.log(`\nEligibility Test ${index + 1}:`)
    console.log(`Input (${typeof testCase}):`, testCase)
    try {
      const result = formatEligibilityCriteria(testCase)
      console.log(`Output:`, result)
      console.log(`✅ Success - ${typeof result}`)
    } catch (error) {
      console.log(`❌ Error:`, error.message)
    }
  })
}

// Helper functions (copy of the actual functions)
function ensureArray(value) {
  if (value === null || value === undefined) {
    return []
  }
  if (Array.isArray(value)) {
    return value
  }
  if (typeof value === 'string') {
    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed
      }
      return [value]
    } catch {
      return [value]
    }
  }
  // Convert single values to arrays
  return [value]
}

function formatEligibilityCriteria(criteria) {
  if (!criteria) {
    return null
  }
  if (Array.isArray(criteria)) {
    return criteria.filter(item => item && typeof item === 'string').join('; ')
  }
  if (typeof criteria === 'string') {
    return criteria
  }
  // Handle objects or other formats
  return String(criteria)
}

// Test PostgreSQL array literal patterns
console.log('\n\n🔍 Testing PostgreSQL Array Literal Patterns')
console.log('=============================================')

const problematicStrings = [
  'Institutions of higher education, including community colleges',
  'Small businesses with innovative scientific or technology solutions',
  '"Quoted string with commas"',
  'String with [brackets]',
  'String with {braces}'
]

problematicStrings.forEach((str, index) => {
  console.log(`\nPattern Test ${index + 1}: "${str}"`)
  
  // Test if this would cause PostgreSQL array literal issues
  const asArray = ensureArray(str)
  const asEligibility = formatEligibilityCriteria(str)
  
  console.log(`As Array:`, asArray)
  console.log(`As Eligibility Text:`, asEligibility)
  
  // Check for potential PostgreSQL array literal patterns
  if (str.includes(',') && !str.startsWith('[')) {
    console.log(`⚠️  Could be misinterpreted as array literal`)
  }
  if (str.includes('"') || str.includes('[') || str.includes('{')) {
    console.log(`⚠️  Contains special characters that might cause parsing issues`)
  }
})

// Run the debug tests
debugArrayLiteralHandling()