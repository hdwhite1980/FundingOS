require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkProjectTypesFilter() {
  try {
    console.log('🔍 Checking project_types on Grants.gov opportunities...\n')
    
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, project_types, source')
      .eq('source', 'grants_gov')
      .limit(20)
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log(`📊 Sample of ${data.length} Grants.gov opportunities:\n`)
    data.forEach((opp, idx) => {
      console.log(`${idx + 1}. ${opp.title.substring(0, 60)}`)
      console.log(`   project_types: ${JSON.stringify(opp.project_types) || 'NULL'}`)
    })
    
    // Count how many have null/empty project_types
    const nullCount = data.filter(o => !o.project_types || o.project_types.length === 0).length
    console.log(`\n📊 ${nullCount} of ${data.length} Grants.gov opportunities have null/empty project_types`)
    
    // Test the overlaps filter
    console.log('\n🔍 Testing overlaps filter with technology_implementation...')
    const { data: filtered, error: filterError } = await supabase
      .from('opportunities')
      .select('id, title, project_types')
      .eq('source', 'grants_gov')
      .overlaps('project_types', ['technology_implementation', 'technology', 'contract', 'services', 'research', 'implementation'])
      .limit(10)
    
    if (!filterError) {
      console.log(`   Found ${filtered?.length || 0} matches with project type filter`)
      if (filtered && filtered.length > 0) {
        filtered.forEach((opp, idx) => {
          console.log(`   ${idx + 1}. ${opp.title.substring(0, 50)} - types: ${JSON.stringify(opp.project_types)}`)
        })
      }
    } else {
      console.error('   Filter error:', filterError)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkProjectTypesFilter()
