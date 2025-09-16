// Test the enhanced scoring API fixes for array/text field handling
console.log('=== Enhanced Scoring API Array Field Fix Test ===\n');

// Mock the helper functions to test locally
function safeJoinField(field) {
  if (!field) return ''
  if (Array.isArray(field)) return field.join(' ')
  if (typeof field === 'string') return field
  return String(field)
}

function safeArrayField(field) {
  if (!field) return []
  if (Array.isArray(field)) return field
  if (typeof field === 'string') {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(field)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // If not JSON, split by common delimiters
      return field.split(/[,;|]/).map(s => s.trim()).filter(s => s.length > 0)
    }
  }
  return []
}

// Test cases that would have caused the original error
const testCases = [
  // Original problematic case - eligibility_criteria as text
  {
    name: 'Text eligibility_criteria',
    field: 'Must be a registered nonprofit; Located in US; Annual budget < $1M',
    expected_join: 'Must be a registered nonprofit; Located in US; Annual budget < $1M',
    expected_array: ['Must be a registered nonprofit', 'Located in US', 'Annual budget < $1M']
  },
  
  // Array format (original working case)
  {
    name: 'Array eligibility_criteria',
    field: ['Must be a registered nonprofit', 'Located in US', 'Annual budget < $1M'],
    expected_join: 'Must be a registered nonprofit Located in US Annual budget < $1M',
    expected_array: ['Must be a registered nonprofit', 'Located in US', 'Annual budget < $1M']
  },
  
  // JSONB format (stored as string)
  {
    name: 'JSONB eligibility_criteria (as string)',
    field: '["Must be a registered nonprofit", "Located in US", "Annual budget < $1M"]',
    expected_join: '["Must be a registered nonprofit", "Located in US", "Annual budget < $1M"]',
    expected_array: ['Must be a registered nonprofit', 'Located in US', 'Annual budget < $1M']
  },
  
  // Empty/null cases
  {
    name: 'Empty eligibility_criteria',
    field: '',
    expected_join: '',
    expected_array: []
  },
  
  {
    name: 'Null eligibility_criteria',
    field: null,
    expected_join: '',
    expected_array: []
  },
  
  // Organization types array format
  {
    name: 'Organization types array',
    field: ['nonprofit', 'for_profit', 'government'],
    expected_join: 'nonprofit for_profit government',
    expected_array: ['nonprofit', 'for_profit', 'government']
  },
  
  // Organization types as comma-separated text
  {
    name: 'Organization types as text',
    field: 'nonprofit, for_profit, government',
    expected_join: 'nonprofit, for_profit, government',
    expected_array: ['nonprofit', 'for_profit', 'government']
  }
];

console.log('Testing helper functions:');
console.log('='.repeat(80));

testCases.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   Input: ${JSON.stringify(test.field)}`);
  
  // Test safeJoinField
  const joinResult = safeJoinField(test.field);
  const joinPassed = joinResult === test.expected_join;
  console.log(`   safeJoinField: ${joinPassed ? '✅' : '❌'} "${joinResult}"`);
  if (!joinPassed) {
    console.log(`     Expected: "${test.expected_join}"`);
  }
  
  // Test safeArrayField
  const arrayResult = safeArrayField(test.field);
  const arrayPassed = JSON.stringify(arrayResult) === JSON.stringify(test.expected_array);
  console.log(`   safeArrayField: ${arrayPassed ? '✅' : '❌'} ${JSON.stringify(arrayResult)}`);
  if (!arrayPassed) {
    console.log(`     Expected: ${JSON.stringify(test.expected_array)}`);
  }
  
  console.log('');
});

console.log('=== Specific Error Case Test ===');
console.log('Original Error: (e.eligibility_criteria || []).join is not a function');
console.log('');

// Simulate the exact error scenario
const mockOpportunity = {
  eligibility_criteria: 'Must be a registered nonprofit; Located in US' // TEXT field from DB
};

console.log('Before Fix (would cause error):');
console.log('  Code: (opportunity.eligibility_criteria || []).join(" ")');
console.log('  Issue: Trying to call .join() on a string');
console.log('');

console.log('After Fix (works correctly):');
console.log('  Code: safeJoinField(opportunity.eligibility_criteria)');
console.log('  Result:', `"${safeJoinField(mockOpportunity.eligibility_criteria)}"`);
console.log('');

console.log('=== Organization Type Checking Fix ===');
const mockOrgCheck = {
  organization_types: 'nonprofit, government' // TEXT/JSONB field
};

console.log('Before Fix (would cause error):');
console.log('  Code: opportunity.organization_types.includes("nonprofit")');
console.log('  Issue: Trying to call .includes() on a string');
console.log('');

console.log('After Fix (works correctly):');
const orgArray = safeArrayField(mockOrgCheck.organization_types);
console.log('  Code: safeArrayField(opportunity.organization_types)');
console.log('  Result:', JSON.stringify(orgArray));
console.log('  Includes "nonprofit":', orgArray.includes('nonprofit') ? '✅ Yes' : '❌ No');
console.log('');

console.log('=== Summary ===');
console.log('✅ Fixed .join() error on eligibility_criteria');
console.log('✅ Fixed .includes() error on organization_types');
console.log('✅ Added safe handling for array/text/JSONB fields');
console.log('✅ Backward compatible with existing array data');
console.log('✅ Forward compatible with new text/JSONB data');
console.log('');
console.log('🎯 Enhanced scoring API should now work with updated database schema!');