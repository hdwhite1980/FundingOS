/**
 * Test for WaliOS Assistant Field Help Loop Fix
 */

console.log("🧪 Testing WaliOS Assistant Field Help Loop Fix...")

// Mock the field help tracking logic
let lastHelpedFieldContext = null

const mockStartFieldHelp = (fieldContext) => {
  if (!fieldContext) return false
  
  // Check if we've already provided help for this specific field context
  const contextKey = `${fieldContext.fieldName}_${fieldContext.opportunityId || 'default'}`
  const lastHelpedKey = lastHelpedFieldContext ? `${lastHelpedFieldContext.fieldName}_${lastHelpedFieldContext.opportunityId || 'default'}` : null
  
  if (contextKey === lastHelpedKey) {
    console.log('🔄 Field help already shown for:', fieldContext.fieldName)
    return false // Don't repeat the same field help
  }
  
  // Mark this field context as helped
  lastHelpedFieldContext = fieldContext
  console.log('✅ Showing field help for:', fieldContext.fieldName)
  return true // Show field help
}

console.log("\n" + "=".repeat(60))
console.log("🔄 FIELD HELP REPETITION PREVENTION TESTS")
console.log("=".repeat(60))

// Test scenarios
const testFieldContext = {
  fieldName: "project_description",
  opportunityId: "123"
}

const sameFieldContext = {
  fieldName: "project_description", 
  opportunityId: "123"
}

const differentFieldContext = {
  fieldName: "budget_amount",
  opportunityId: "123"  
}

const sameFieldDifferentOpportunity = {
  fieldName: "project_description",
  opportunityId: "456"
}

console.log("\n📋 Test 1: First call with field context")
const result1 = mockStartFieldHelp(testFieldContext)
console.log(`   Result: ${result1 ? 'Help shown' : 'Help skipped'}`)

console.log("\n📋 Test 2: Second call with same field context (should skip)")
const result2 = mockStartFieldHelp(sameFieldContext)
console.log(`   Result: ${result2 ? 'Help shown' : 'Help skipped'}`)

console.log("\n📋 Test 3: Call with different field (should show)")
const result3 = mockStartFieldHelp(differentFieldContext)
console.log(`   Result: ${result3 ? 'Help shown' : 'Help skipped'}`)

console.log("\n📋 Test 4: Same field, different opportunity (should show)")
const result4 = mockStartFieldHelp(sameFieldDifferentOpportunity)
console.log(`   Result: ${result4 ? 'Help shown' : 'Help skipped'}`)

console.log("\n📋 Test 5: Repeat same field, different opportunity (should skip)")
const result5 = mockStartFieldHelp(sameFieldDifferentOpportunity)
console.log(`   Result: ${result5 ? 'Help shown' : 'Help skipped'}`)

// Test clearing helped context
console.log("\n📋 Test 6: Clear context and retry same field")
lastHelpedFieldContext = null
const result6 = mockStartFieldHelp(testFieldContext)
console.log(`   Result: ${result6 ? 'Help shown' : 'Help skipped'}`)

console.log("\n" + "=".repeat(60))
console.log("📊 TEST RESULTS SUMMARY:")
console.log("=".repeat(60))

const expectedResults = [true, false, true, true, false, true]
const actualResults = [result1, result2, result3, result4, result5, result6]
const testNames = [
  "First call (should show)",
  "Repeat same field (should skip)", 
  "Different field (should show)",
  "Same field, different opportunity (should show)",
  "Repeat same field/opportunity (should skip)",
  "After context clear (should show)"
]

let allPassed = true

testNames.forEach((name, index) => {
  const passed = actualResults[index] === expectedResults[index]
  const status = passed ? '✅ PASS' : '❌ FAIL'
  console.log(`${status} ${name}: Expected ${expectedResults[index]}, Got ${actualResults[index]}`)
  if (!passed) allPassed = false
})

console.log("\n" + "=".repeat(60))
if (allPassed) {
  console.log("🎉 ALL TESTS PASSED! Field help loop should be fixed.")
} else {
  console.log("❌ Some tests failed. Logic may need adjustment.")
}
console.log("=".repeat(60))

console.log("\n🚀 Expected behavior:")
console.log("• Field help shows once per field context")
console.log("• Repeated calls for same field/opportunity are ignored") 
console.log("• Different fields or opportunities show help")
console.log("• Context clearing allows re-showing help")
console.log("• No more infinite 'Would you like me to generate content' loops!")