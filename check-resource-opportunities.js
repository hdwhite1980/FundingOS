require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkResourceOpportunities() {
  try {
    console.log('🔍 Checking resource opportunities in database...\n')
    
    // Check for opportunities with ai_categories containing resource tags
    const resourceTags = ['resources', 'non_monetary', 'in_kind', 'software_grant', 'cloud_credits']
    
    console.log('Test 1: Opportunities with resource ai_categories')
    const { data: withCategories, error: err1 } = await supabase
      .from('opportunities')
      .select('id, title, ai_analysis, ai_categories, amount_min, amount_max')
      .overlaps('ai_categories', resourceTags)
      .limit(10)
    
    console.log(`   Found: ${withCategories?.length || 0} opportunities`)
    if (withCategories && withCategories.length > 0) {
      withCategories.forEach(opp => {
        console.log(`\n   - ${opp.title}`)
        console.log(`     ai_categories: ${JSON.stringify(opp.ai_categories)}`)
        console.log(`     ai_analysis.isNonMonetaryResource: ${opp.ai_analysis?.isNonMonetaryResource}`)
        console.log(`     amounts: min=${opp.amount_min}, max=${opp.amount_max}`)
      })
    }
    
    // Check for opportunities with ai_analysis.isNonMonetaryResource = true
    console.log('\n\nTest 2: Opportunities with ai_analysis.isNonMonetaryResource = true')
    const { data: withFlag, error: err2 } = await supabase
      .from('opportunities')
      .select('id, title, ai_analysis, ai_categories')
      .eq('ai_analysis->>isNonMonetaryResource', 'true')
      .limit(10)
    
    console.log(`   Found: ${withFlag?.length || 0} opportunities`)
    if (withFlag && withFlag.length > 0) {
      withFlag.forEach(opp => {
        console.log(`\n   - ${opp.title}`)
        console.log(`     ai_analysis: ${JSON.stringify(opp.ai_analysis)}`)
        console.log(`     ai_categories: ${JSON.stringify(opp.ai_categories)}`)
      })
    }
    
    // Test the exact query that resourceOnly would use
    console.log('\n\nTest 3: Simulating resourceOnly query (nonMonetaryOnly + aiCategories)')
    let query = supabase
      .from('opportunities')
      .select('id, title, ai_analysis, ai_categories, amount_min, amount_max')
      .is('amount_min', null)
      .is('amount_max', null)
      .eq('ai_analysis->>isNonMonetaryResource', 'true')
      .not('title', 'ilike', '%funding opportunity%')
      .not('title', 'ilike', '%nofo%')
      .not('title', 'ilike', '%sbir%')
      .not('title', 'ilike', '%sttr%')
      .not('description', 'ilike', '%$%')
      .not('description', 'ilike', '% grant of %')
      .not('description', 'ilike', '% funding opportunity %')
      .not('description', 'ilike', '% cash %')
      .not('description', 'ilike', '% award %')
      .not('description', 'ilike', '% stipend %')
      .not('description', 'ilike', '% loan %')
      .limit(10)
    
    const { data: resourceQuery, error: err3 } = await query
    console.log(`   Found: ${resourceQuery?.length || 0} opportunities`)
    if (err3) console.error('   Error:', err3)
    if (resourceQuery && resourceQuery.length > 0) {
      resourceQuery.forEach(opp => {
        console.log(`\n   - ${opp.title}`)
        console.log(`     ai_categories: ${JSON.stringify(opp.ai_categories)}`)
      })
    }
    
    // Check all sources
    console.log('\n\nTest 4: Breakdown by source')
    const { data: allOpps } = await supabase
      .from('opportunities')
      .select('source')
    
    const bySource = {}
    allOpps?.forEach(opp => {
      const source = opp.source || 'unknown'
      bySource[source] = (bySource[source] || 0) + 1
    })
    
    console.log('   Sources:')
    Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
      console.log(`     ${source}: ${count}`)
    })
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkResourceOpportunities()
