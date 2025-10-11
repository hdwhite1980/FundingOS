require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testNullSafeFilters() {
  try {
    console.log('🔍 Testing NULL-safe filter approaches\n')
    
    // Test 1: Using filter() with custom expression
    console.log('Test 1: Using .filter() for NULL-safe check')
    const { data: test1, error: err1 } = await supabase
      .from('opportunities')
      .select('id, title, ai_analysis, ai_categories')
      .eq('source', 'grants_gov')
      .filter('ai_analysis->>isNonMonetaryResource', 'in', '(null,false,"")')
      .limit(5)
    
    console.log(`   Result: ${test1?.length || 0} opportunities`)
    if (err1) console.error('   Error:', err1.message)
    
    // Test 2: Simple approach - just skip the NULL check and only exclude 'true'
    console.log('\nTest 2: Skip NULL entirely, just filter != true')
    let query2 = supabase
      .from('opportunities')
      .select('id, title, project_types, source, ai_analysis, ai_categories')
      .eq('source', 'grants_gov')
      .overlaps('project_types', ['general'])
    
    // Don't add any resource filters - see if that works
    const { data: test2, error: err2 } = await query2.limit(5)
    console.log(`   Result: ${test2?.length || 0} opportunities`)
    if (err2) console.error('   Error:', err2.message)
    
    // Test 3: Use IS NOT TRUE instead of NEQ TRUE
    console.log('\nTest 3: Using "is not true" check')
    const { data: test3, error: err3 } = await supabase
      .from('opportunities')
      .select('id, title, ai_analysis')
      .eq('source', 'grants_gov')
      .not('ai_analysis->isNonMonetaryResource', 'is', true)
      .limit(5)
    
    console.log(`   Result: ${test3?.length || 0} opportunities`)
    if (err3) console.error('   Error:', err3.message)
    
    // Test 4: Just don't filter on NULL columns at all
    console.log('\nTest 4: Skip resource filters entirely for now')
    let query4 = supabase
      .from('opportunities')
      .select('id, title, project_types, source')
      .eq('source', 'grants_gov')
      .overlaps('project_types', ['general'])
    
    const { data: test4, error: err4 } = await query4.limit(5)
    console.log(`   Result: ${test4?.length || 0} opportunities`)
    if (err4) console.error('   Error:', err4.message)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testNullSafeFilters()
