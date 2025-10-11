require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkLatestAIOpportunities() {
  try {
    console.log('🔍 Checking latest AI-discovered opportunities...\n')
    
    // Get the most recent opportunities from AI discovery
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, source, project_types, ai_analysis, ai_categories, amount_min, amount_max, created_at')
      .eq('source', 'ai_enhanced_discovery')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`📊 Found ${data.length} AI-discovered opportunities\n`)
    
    data.forEach((opp, idx) => {
      console.log(`${idx + 1}. ${opp.title}`)
      console.log(`   Created: ${new Date(opp.created_at).toLocaleString()}`)
      console.log(`   Project Types: ${JSON.stringify(opp.project_types)}`)
      console.log(`   AI Categories: ${JSON.stringify(opp.ai_categories)}`)
      console.log(`   AI Analysis (isNonMonetaryResource): ${opp.ai_analysis?.isNonMonetaryResource}`)
      console.log(`   Amounts: min=${opp.amount_min}, max=${opp.amount_max}`)
      console.log()
    })
    
    // Check what would be returned by resourceOnly query
    console.log('\n🔍 Testing resourceOnly query...')
    const { data: resourceData, error: resErr } = await supabase
      .from('opportunities')
      .select('id, title, project_types')
      .is('amount_min', null)
      .is('amount_max', null)
      .eq('ai_analysis->>isNonMonetaryResource', 'true')
      .not('title', 'ilike', '%nofo%')
      .not('title', 'ilike', '%sbir%')
      .not('title', 'ilike', '%sttr%')
      .limit(20)
    
    if (!resErr) {
      console.log(`   Found ${resourceData.length} opportunities matching resourceOnly query`)
      resourceData.forEach(o => {
        console.log(`   - ${o.title}`)
        console.log(`     Project Types: ${JSON.stringify(o.project_types)}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkLatestAIOpportunities()
