require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testCompleteFlow() {
  try {
    console.log('🔍 Testing complete data flow for Grants view\n')
    
    // Simulate the exact query that OpportunityList would make
    // with a technology_implementation project
    
    const projectTypes = ['technology_implementation']
    const inclusiveTypes = [
      'technology_implementation',
      'technology',
      'contract',
      'services',
      'research',
      'implementation',
      'general'  // The fix!
    ]
    const uniqueTypes = [...new Set(inclusiveTypes)]
    
    console.log('📋 Simulating OpportunityList.js query:')
    console.log(`   Project types filter: ${uniqueTypes.join(', ')}\n`)
    
    // Build the exact query that opportunityService.getOpportunities would build
    let query = supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false })
    
    // Apply project type filter
    query = query.overlaps('project_types', uniqueTypes)
    
    // Apply simplified resource exclusion (heuristics only, no AI filters)
    const resourceTitleCues = [
      '%ad grant%', '%ad grants%', '%nonprofit advertising%', '%promotional credit%', '%cloud credit%'
    ]
    resourceTitleCues.forEach(cue => {
      query = query.not('title', 'ilike', cue)
    })
    const resourceDescCues = [
      '%advertising credit%', '%ad credit%', '%promotional credit%', '%cloud credit%'
    ]
    resourceDescCues.forEach(cue => {
      query = query.not('description', 'ilike', cue)
    })
    
    // Limit to 200
    query = query.limit(200)
    
    console.log('🚀 Executing query...\n')
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Query error:', error)
      return
    }
    
    console.log(`✅ Query returned ${data.length} opportunities\n`)
    
    // Analyze results
    const bySource = {}
    data.forEach(opp => {
      const source = opp.source || 'unknown'
      bySource[source] = (bySource[source] || 0) + 1
    })
    
    console.log('📊 Results by source:')
    Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`)
    })
    
    const grantsGovCount = data.filter(o => o.source === 'grants_gov').length
    console.log(`\n✅ ${grantsGovCount} Grants.gov opportunities in results`)
    
    if (grantsGovCount > 0) {
      console.log('\n📝 Sample Grants.gov opportunities:')
      data.filter(o => o.source === 'grants_gov').slice(0, 5).forEach((opp, idx) => {
        console.log(`   ${idx + 1}. ${opp.title.substring(0, 60)}`)
        console.log(`      Types: ${JSON.stringify(opp.project_types)}`)
        console.log(`      AI Analysis: ${opp.ai_analysis ? 'Yes' : 'No'}`)
        console.log(`      AI Categories: ${opp.ai_categories ? JSON.stringify(opp.ai_categories) : 'None'}`)
      })
    } else {
      console.log('\n⚠️  NO Grants.gov opportunities in results!')
      console.log('Debugging: Checking if Grants.gov opps exist with "general" type...')
      
      const { data: ggCheck } = await supabase
        .from('opportunities')
        .select('id, title, project_types')
        .eq('source', 'grants_gov')
        .contains('project_types', ['general'])
        .limit(5)
      
      if (ggCheck && ggCheck.length > 0) {
        console.log(`Found ${ggCheck.length} Grants.gov opps with "general" type`)
        ggCheck.forEach(o => console.log(`   - ${o.title.substring(0, 50)}`))
        console.log('\n❌ They exist but are not being returned by overlaps filter!')
      }
    }
    
    // Test client-side filters
    console.log('\n🔍 Testing client-side resource filter...')
    const clientFiltered = data.filter(opp => {
      const aiFlag = opp?.ai_analysis?.isNonMonetaryResource
      const categories = Array.isArray(opp?.ai_categories) ? opp.ai_categories.map(c => String(c).toLowerCase()) : []
      const resourceTags = ['resources','non_monetary','in_kind','software_grant','cloud_credits','data_credits','ad_credits']
      const hasResourceTag = aiFlag === true || aiFlag === 'true' || categories.some(c => resourceTags.includes(c))
      
      const t = (opp?.title || '').toLowerCase()
      const d = (opp?.description || '').toLowerCase()
      const titleCues = ['ad grant', 'ad grants', 'nonprofit advertising', 'promotional credit', 'cloud credit']
      const descCues = ['advertising credit', 'ad credit', 'promotional credit', 'cloud credit']
      const hasResourceCues = titleCues.some(c => t.includes(c)) || descCues.some(c => d.includes(c))
      
      return !hasResourceTag && !hasResourceCues
    })
    
    const clientGrantsGovCount = clientFiltered.filter(o => o.source === 'grants_gov').length
    console.log(`✅ After client-side filtering: ${clientFiltered.length} total (${clientGrantsGovCount} from Grants.gov)`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testCompleteFlow()
