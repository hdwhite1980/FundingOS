require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function fixLegacySubmissions() {
  try {
    console.log('🔧 Starting legacy submissions fix...')
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set')
    console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set')
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Simplified approach - just try to run the update query
    // This will update all submissions with null opportunity_id to use a placeholder
    console.log('🔄 Attempting to update null opportunity_id values...')
    
    // First check if there are any null values
    const countQuery = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .is('opportunity_id', null)
    
    console.log('Count result:', countQuery)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
  }
}

fixLegacySubmissions()