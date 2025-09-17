// Check projects table structure
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'placeholder_url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function checkProjectsTableStructure() {
  console.log('=== Projects Table Structure Check ===')
  
  try {
    // Check if we can query the table structure
    const { data: tableInfo, error: infoError } = await supabaseServiceRole
      .rpc('get_table_columns', { table_name: 'projects' })
    
    if (infoError) {
      console.log('Cannot get detailed table info, trying basic query...')
      
      // Try a basic query to see what works
      const { data: testData, error: testError } = await supabaseServiceRole
        .from('projects')
        .select('*')
        .limit(1)
      
      if (testError) {
        console.error('Projects table query error:', testError)
      } else {
        console.log('✅ Projects table is accessible')
        if (testData && testData.length > 0) {
          console.log('Sample project columns:', Object.keys(testData[0]))
        }
      }
    } else {
      console.log('Table columns:', tableInfo)
    }
    
  } catch (error) {
    console.error('Table check error:', error.message)
  }
}

checkProjectsTableStructure()