require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testProjectTypeFilter() {
  try {
    console.log('🔍 Testing project type filter with "general" included...\n')
    
    // Simulate what the UI will query with technology_implementation project
    const inclusiveTypes = [
      'technology_implementation',
      'technology',
      'contract',
      'services',
      'research',
      'implementation',
      'general'  // The fix!
    ]
    
    console.log(`🔍 Querying with types: ${inclusiveTypes.join(', ')}\n`)
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, project_types, source')
      .overlaps('project_types', inclusiveTypes)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`✅ Found ${data.length} opportunities:\n`)
    
    // Count by source
    const bySource = {}
    data.forEach(opp => {
      const source = opp.source || 'unknown'
      bySource[source] = (bySource[source] || 0) + 1
    })
    
    console.log('📊 Results by source:')
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`)
    })
    
    console.log('\n📝 Sample results:')
    data.slice(0, 5).forEach((opp, idx) => {
      console.log(`   ${idx + 1}. [${opp.source}] ${opp.title.substring(0, 60)}`)
      console.log(`      Types: ${JSON.stringify(opp.project_types)}`)
    })
    
    const grantsGovCount = data.filter(o => o.source === 'grants_gov').length
    console.log(`\n✅ ${grantsGovCount} of ${data.length} results are from Grants.gov`)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testProjectTypeFilter()
