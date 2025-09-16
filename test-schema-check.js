// Quick test to check if the enhanced AI discovery database fields exist
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchemaFields() {
  try {
    // Check what columns exist in the opportunities table
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'opportunities')
      .in('column_name', [
        'estimated_funding', 
        'fit_score', 
        'status', 
        'project_types',
        'eligibility_criteria',
        'competitive_analysis',
        'matching_projects'
      ])

    if (error) {
      console.error('Schema check error:', error)
      return
    }

    console.log('🔍 Enhanced AI Discovery Fields Check:')
    console.log('=====================================')
    
    const requiredFields = [
      'estimated_funding', 
      'fit_score', 
      'status', 
      'project_types',
      'eligibility_criteria',
      'competitive_analysis',
      'matching_projects'
    ]
    
    const existingFields = data.map(row => row.column_name)
    
    requiredFields.forEach(field => {
      const exists = existingFields.includes(field)
      const fieldData = data.find(row => row.column_name === field)
      console.log(`${exists ? '✅' : '❌'} ${field}: ${exists ? fieldData.data_type : 'MISSING'}`)
    })
    
    const missingCount = requiredFields.filter(field => !existingFields.includes(field)).length
    
    console.log('\n📊 Summary:')
    console.log(`Found: ${existingFields.length}/${requiredFields.length} required fields`)
    
    if (missingCount > 0) {
      console.log('\n⚠️  Database migration needed!')
      console.log('Run the database_enhanced_ai_discovery.sql script in Supabase')
    } else {
      console.log('\n✅ All enhanced AI discovery fields are present!')
    }
    
  } catch (error) {
    console.error('Schema check failed:', error)
  }
}

checkSchemaFields()