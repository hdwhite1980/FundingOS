require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testRelaxedResourceQuery() {
  try {
    console.log('🔍 Testing relaxed resourceOnly query...\n')
    
    // Test with relaxed filters (like the updated code)
    let query = supabase
      .from('opportunities')
      .select('id, title, ai_analysis, ai_categories')
      .is('amount_min', null)
      .is('amount_max', null)
      .eq('ai_analysis->>isNonMonetaryResource', 'true')
      .not('title', 'ilike', '%nofo%')
      .not('title', 'ilike', '%sbir%')
      .not('title', 'ilike', '%sttr%')
      .limit(20)
    
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`✅ Found ${data.length} resource opportunities\n`)
    
    if (data && data.length > 0) {
      data.forEach((opp, idx) => {
        console.log(`${idx + 1}. ${opp.title}`)
        console.log(`   Categories: ${JSON.stringify(opp.ai_categories)}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testRelaxedResourceQuery()
