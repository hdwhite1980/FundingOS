require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkGrantsGovOpportunities() {
  try {
    console.log('🔍 Checking Grants.gov opportunities...\n')
    
    // Check total Grants.gov opportunities
    const { data: allGrantsGov, error: allError } = await supabase
      .from('opportunities')
      .select('id, title, source, ai_analysis, ai_categories, amount_min, amount_max')
      .eq('source', 'grants_gov')
      .limit(20)
    
    if (allError) {
      console.error('❌ Error fetching Grants.gov opportunities:', allError)
      return
    }
    
    console.log(`📊 Found ${allGrantsGov?.length || 0} Grants.gov opportunities\n`)
    
    if (allGrantsGov && allGrantsGov.length > 0) {
      console.log('Sample Grants.gov opportunities:')
      allGrantsGov.forEach((opp, idx) => {
        console.log(`\n${idx + 1}. ${opp.title}`)
        console.log(`   ID: ${opp.id}`)
        console.log(`   Source: ${opp.source}`)
        console.log(`   Amount: ${opp.amount_min || 'N/A'} - ${opp.amount_max || 'N/A'}`)
        console.log(`   AI Categories: ${opp.ai_categories ? JSON.stringify(opp.ai_categories) : 'none'}`)
        console.log(`   AI Analysis: ${opp.ai_analysis ? JSON.stringify(opp.ai_analysis) : 'none'}`)
      })
      
      // Check if any would be filtered out by our Grants view logic
      console.log('\n\n🔍 Checking filter logic...')
      const filtered = allGrantsGov.filter(opp => {
        const aiFlag = opp?.ai_analysis?.isNonMonetaryResource
        const categories = Array.isArray(opp?.ai_categories) ? opp.ai_categories.map(c => String(c).toLowerCase()) : []
        const resourceTags = ['resources','non_monetary','in_kind','software_grant','cloud_credits','data_credits','ad_credits']
        
        const hasResourceTag = categories.some(c => resourceTags.includes(c))
        const hasAIFlag = aiFlag === true || aiFlag === 'true'
        
        const t = (opp?.title || '').toLowerCase()
        const d = (opp?.description || '').toLowerCase()
        const titleCues = ['ad grant', 'ad grants', 'nonprofit advertising', 'promotional credit', 'cloud credit']
        const descCues = ['advertising credit', 'ad credit', 'promotional credit', 'cloud credit']
        const hasResourceCues = titleCues.some(c => t.includes(c)) || descCues.some(c => d.includes(c))
        
        const wouldBeExcluded = hasAIFlag || hasResourceTag || hasResourceCues
        
        if (wouldBeExcluded) {
          console.log(`\n❌ WOULD BE FILTERED OUT: ${opp.title}`)
          console.log(`   Reason: AI Flag=${hasAIFlag}, Resource Tag=${hasResourceTag}, Resource Cues=${hasResourceCues}`)
        }
        
        return !wouldBeExcluded
      })
      
      console.log(`\n\n✅ ${filtered.length} of ${allGrantsGov.length} Grants.gov opportunities would pass Grants view filters`)
    } else {
      console.log('⚠️  No Grants.gov opportunities found in database')
    }
    
    // Check all opportunities grouped by source
    console.log('\n\n📊 Opportunities by source:')
    const { data: allOpps, error: allOppsError } = await supabase
      .from('opportunities')
      .select('source')
    
    if (!allOppsError && allOpps) {
      const bySource = {}
      allOpps.forEach(opp => {
        const source = opp.source || 'unknown'
        bySource[source] = (bySource[source] || 0) + 1
      })
      
      Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkGrantsGovOpportunities()
