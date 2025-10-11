require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testOverlapsOperator() {
  try {
    console.log('🔍 Testing overlaps operator with different approaches\n')
    
    // Test 1: Simple overlaps with just "general"
    console.log('Test 1: overlaps with ["general"]')
    const { data: test1, error: err1 } = await supabase
      .from('opportunities')
      .select('id, title, project_types, source')
      .eq('source', 'grants_gov')
      .overlaps('project_types', ['general'])
      .limit(5)
    
    console.log(`   Result: ${test1?.length || 0} opportunities`)
    if (err1) console.error('   Error:', err1)
    
    // Test 2: overlaps with multiple types including "general"
    console.log('\nTest 2: overlaps with ["technology", "general"]')
    const { data: test2, error: err2 } = await supabase
      .from('opportunities')
      .select('id, title, project_types, source')
      .eq('source', 'grants_gov')
      .overlaps('project_types', ['technology', 'general'])
      .limit(5)
    
    console.log(`   Result: ${test2?.length || 0} opportunities`)
    if (err2) console.error('   Error:', err2)
    
    // Test 3: contains with "general"
    console.log('\nTest 3: contains ["general"]')
    const { data: test3, error: err3 } = await supabase
      .from('opportunities')
      .select('id, title, project_types, source')
      .eq('source', 'grants_gov')
      .contains('project_types', ['general'])
      .limit(5)
    
    console.log(`   Result: ${test3?.length || 0} opportunities`)
    if (err3) console.error('   Error:', err3)
    
    // Test 4: Check actual project_types data
    console.log('\nTest 4: Raw data check (no overlaps filter)')
    const { data: test4, error: err4 } = await supabase
      .from('opportunities')
      .select('id, title, project_types, source')
      .eq('source', 'grants_gov')
      .limit(5)
    
    console.log(`   Result: ${test4?.length || 0} opportunities`)
    if (test4 && test4.length > 0) {
      test4.forEach(o => {
        console.log(`   - ${o.title.substring(0, 40)}`)
        console.log(`     project_types: ${JSON.stringify(o.project_types)} (type: ${typeof o.project_types})`)
      })
    }
    
    // Test 5: Try with NULL-safe resource exclusions
    console.log('\nTest 5: overlaps with ["general"] WITH NULL-safe resource exclusions')
    let query = supabase
      .from('opportunities')
      .select('id, title, project_types, source, ai_analysis, ai_categories')
      .eq('source', 'grants_gov')
      .overlaps('project_types', ['general'])
    
    // Add NULL-safe resource exclusions
    query = query.or('ai_analysis->>isNonMonetaryResource.is.null,ai_analysis->>isNonMonetaryResource.neq.true')
    const resourceTags = ['resources','non_monetary','in_kind','software_grant','cloud_credits','data_credits','ad_credits']
    resourceTags.forEach(tag => {
      query = query.or(`ai_categories.is.null,not.ai_categories.cs.{${tag}}`)
    })
    
    const { data: test5, error: err5 } = await query.limit(5)
    console.log(`   Result: ${test5?.length || 0} opportunities`)
    if (err5) console.error('   Error:', err5)
    if (test5 && test5.length > 0) {
      test5.forEach(o => {
        console.log(`   - ${o.title.substring(0, 40)}`)
        console.log(`     ai_analysis: ${o.ai_analysis ? JSON.stringify(o.ai_analysis) : 'null'}`)
        console.log(`     ai_categories: ${o.ai_categories ? JSON.stringify(o.ai_categories) : 'null'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testOverlapsOperator()
