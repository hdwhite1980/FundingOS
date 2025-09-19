require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkOpportunities() {
  try {
    console.log('🔍 Checking opportunities in database...')
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set')
    console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set')
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Error getting count:', countError)
      return
    }
    
    console.log(`📊 Total opportunities: ${count}`)
    
    // Get sample opportunities
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, sponsor, source, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('❌ Error fetching opportunities:', error)
      return
    }
    
    console.log('\n📋 Sample opportunities:')
    data.forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.title} (ID: ${opp.id})`)
      console.log(`   Sponsor: ${opp.sponsor || 'N/A'}`)
      console.log(`   Source: ${opp.source || 'N/A'}`)
      console.log(`   Created: ${opp.created_at}`)
      console.log('')
    })
    
    // Test creating a default opportunity for manual entries
    console.log('🔧 Testing creation of default opportunity...')
    
    const { data: existingDefault, error: defaultCheckError } = await supabase
      .from('opportunities')
      .select('id')
      .eq('title', 'Manual Entry - Default Opportunity')
      .single()
    
    if (defaultCheckError && defaultCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking for default opportunity:', defaultCheckError)
      return
    }
    
    if (existingDefault) {
      console.log(`✅ Default opportunity already exists with ID: ${existingDefault.id}`)
    } else {
      console.log('➕ Creating default opportunity for manual entries...')
      
      const { data: newDefault, error: createError } = await supabase
        .from('opportunities')
        .insert([{
          title: 'Manual Entry - Default Opportunity',
          sponsor: 'Manual Entry',
          source: 'manual',
          amount_min: 0,
          amount_max: 1000000,
          description: 'Default opportunity for manually tracked applications',
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single()
      
      if (createError) {
        console.error('❌ Error creating default opportunity:', createError)
        return
      }
      
      console.log(`✅ Default opportunity created with ID: ${newDefault.id}`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkOpportunities()