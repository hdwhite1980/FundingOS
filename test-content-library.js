/**
 * Test script for findRelevantPastContent function
 */

// Mock the function (since it's defined in a React component file)
const findRelevantPastContent = (currentField, userApplicationHistory = []) => {
  if (!currentField || !userApplicationHistory || userApplicationHistory.length === 0) {
    return []
  }

  const fieldName = currentField.name?.toLowerCase() || currentField.toLowerCase()
  
  return userApplicationHistory
    .filter(app => app.fields && app.status !== 'rejected')
    .map(app => {
      // Find matching fields by name similarity
      const matchingFields = Object.entries(app.fields || {}).filter(([key, value]) => {
        const keyLower = key.toLowerCase()
        return keyLower.includes(fieldName) || 
               fieldName.includes(keyLower) ||
               // Common field mappings
               (fieldName.includes('description') && keyLower.includes('description')) ||
               (fieldName.includes('objective') && keyLower.includes('objective')) ||
               (fieldName.includes('goal') && keyLower.includes('goal')) ||
               (fieldName.includes('summary') && keyLower.includes('summary')) ||
               (fieldName.includes('statement') && keyLower.includes('statement'))
      })
      
      return matchingFields.map(([key, value]) => ({
        applicationName: app.name || app.opportunityTitle || 'Previous Application',
        successRate: app.status === 'awarded' ? 100 : app.status === 'submitted' ? 75 : 50,
        text: value && typeof value === 'string' ? value : String(value || ''),
        fieldName: key,
        applicationId: app.id
      }))
    })
    .flat()
    .filter(content => content.text && content.text.length > 20) // Filter out very short content
    .sort((a, b) => b.successRate - a.successRate) // Sort by success rate
    .slice(0, 5) // Limit to top 5 most relevant
}

console.log("🧪 Testing findRelevantPastContent function...")

// Test data
const mockApplicationHistory = [
  {
    id: 1,
    name: "SBIR Phase I Grant",
    status: "awarded",
    fields: {
      project_description: "This is a detailed project description about AI development for healthcare applications. We aim to create innovative solutions that improve patient outcomes through advanced machine learning algorithms.",
      technical_objective: "Develop machine learning models for predictive healthcare analytics",
      business_summary: "Our startup focuses on healthcare AI solutions"
    }
  },
  {
    id: 2,
    name: "NSF Innovation Grant",
    status: "submitted",
    fields: {
      project_summary: "Educational technology platform for remote learning",
      goals_and_objectives: "Create accessible learning tools for underserved communities",
      technical_approach: "Web-based platform with mobile optimization"
    }
  },
  {
    id: 3,
    name: "Failed Application",
    status: "rejected",
    fields: {
      description: "This should not appear in results"
    }
  }
]

// Test cases
const testCases = [
  {
    field: "project_description",
    expected: "Should find project_description from SBIR grant"
  },
  {
    field: "technical_objective", 
    expected: "Should find technical_objective and goals_and_objectives"
  },
  {
    field: "summary",
    expected: "Should find business_summary and project_summary"
  },
  {
    field: { name: "description" },
    expected: "Should find project_description (object field)"
  }
]

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test Case ${index + 1}: ${testCase.expected}`)
  const result = findRelevantPastContent(testCase.field, mockApplicationHistory)
  
  console.log(`   Found ${result.length} relevant content items:`)
  result.forEach((content, idx) => {
    console.log(`   ${idx + 1}. From "${content.applicationName}" (${content.successRate}% success)`)
    console.log(`      Field: ${content.fieldName}`)
    console.log(`      Text: ${content.text.substring(0, 100)}...`)
  })
  
  if (result.length === 0) {
    console.log(`   ⚠️  No relevant content found`)
  }
})

// Edge case tests
console.log(`\n🔍 Edge Case Tests:`)

console.log(`\n1. Empty application history:`)
const emptyResult = findRelevantPastContent("description", [])
console.log(`   Result: ${emptyResult.length} items (should be 0)`)

console.log(`\n2. Null/undefined field:`)
const nullResult = findRelevantPastContent(null, mockApplicationHistory)
console.log(`   Result: ${nullResult.length} items (should be 0)`)

console.log(`\n3. Field with no matches:`)
const noMatchResult = findRelevantPastContent("nonexistent_field", mockApplicationHistory)
console.log(`   Result: ${noMatchResult.length} items (should be 0)`)

console.log(`\n✅ All tests completed!`)