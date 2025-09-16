// Simple test to verify database schema
console.log('Testing database connection and schema...')

// Test if we can create a minimal opportunity record
const testOpportunity = {
  external_id: 'test-schema-' + Date.now(),
  source: 'schema_test',
  title: 'Test Opportunity',
  agency: 'Test Agency',
  description: 'Test description',
  eligibility_criteria: 'Institutions of higher education, including community colleges, that have not received an ATE award in the past seven years',
  project_types: ['education', 'technology'],
  status: 'discovered',
  fit_score: 75.5,
  discovered_at: new Date().toISOString(),
  last_updated: new Date().toISOString()
}

console.log('Test opportunity data:')
console.log(JSON.stringify(testOpportunity, null, 2))

console.log('\n⚠️  To test the actual database insertion:')
console.log('1. Copy the test opportunity data above')
console.log('2. Try inserting it directly in Supabase SQL Editor:')
console.log('   INSERT INTO opportunities (external_id, source, title, agency, description, eligibility_criteria, project_types, status, fit_score, discovered_at, last_updated)')
console.log('   VALUES (\'test-schema-123\', \'schema_test\', \'Test Opportunity\', \'Test Agency\', \'Test description\', \'Institutions of higher education\', \'["education", "technology"]\', \'discovered\', 75.5, NOW(), NOW());')
console.log('\n3. If this fails, it means the schema migration didn\'t complete properly')
console.log('4. Re-run the database_enhanced_ai_discovery.sql script')