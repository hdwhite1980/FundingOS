require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOpportunityDates() {
  try {
    console.log('🔍 Checking opportunity dates by source...\n')
    
    // Get date range for Grants.gov
    const { data: grantsGov, error: ggError } = await supabase
      .from('opportunities')
      .select('created_at, title')
      .eq('source', 'grants_gov')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!ggError && grantsGov) {
      console.log('📅 Most recent Grants.gov opportunities:')
      grantsGov.forEach((opp, idx) => {
        console.log(`   ${idx + 1}. ${new Date(opp.created_at).toLocaleDateString()} - ${opp.title.substring(0, 60)}`)
      })
    }
    
    // Get date range for AI-enhanced
    const { data: aiEnhanced, error: aiError } = await supabase
      .from('opportunities')
      .select('created_at, title')
      .eq('source', 'ai_enhanced_discovery')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (!aiError && aiEnhanced) {
      console.log('\n📅 Most recent AI-enhanced opportunities:')
      aiEnhanced.forEach((opp, idx) => {
        console.log(`   ${idx + 1}. ${new Date(opp.created_at).toLocaleDateString()} - ${opp.title.substring(0, 60)}`)
      })
    }
    
    // Check what the limit(200) query would return
    console.log('\n🔍 Simulating limit(200) query with DESC sort...')
    const { data: limited, error: limitError } = await supabase
      .from('opportunities')
      .select('source')
      .order('created_at', { ascending: false })
      .limit(200)
    
    if (!limitError && limited) {
      const bySource = {}
      limited.forEach(opp => {
        const source = opp.source || 'unknown'
        bySource[source] = (bySource[source] || 0) + 1
      })
      
      console.log('\n📊 Sources in top 200 (newest):')
      Object.entries(bySource).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkOpportunityDates()
