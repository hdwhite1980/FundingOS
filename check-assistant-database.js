import { createClient } from '@supabase/supabase-js'

// Your Supabase connection details
const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Testing Supabase connection and checking WALI-OS Assistant requirements...\n')

async function checkAssistantTables() {
  const requiredTables = [
    'profiles',
    'user_profiles', 
    'projects',
    'company_settings',
    'submissions',
    'opportunities',
    'assistant_sessions',
    'assistant_conversations',
    'ai_org_context_cache',
    'user_settings'
  ]

  const results = {}

  for (const tableName of requiredTables) {
    try {
      console.log(`📊 Checking table: ${tableName}`)
      
      // Try to query the table
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1)

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          results[tableName] = { exists: false, error: 'Table does not exist' }
          console.log(`   ❌ ${tableName}: Table does not exist`)
        } else {
          results[tableName] = { exists: false, error: error.message }
          console.log(`   ⚠️  ${tableName}: Error - ${error.message}`)
        }
      } else {
        results[tableName] = { exists: true, recordCount: count }
        console.log(`   ✅ ${tableName}: Exists with ${count || 0} records`)
      }

    } catch (e) {
      results[tableName] = { exists: false, error: e.message }
      console.log(`   ❌ ${tableName}: Exception - ${e.message}`)
    }
  }

  console.log('\n📋 SUMMARY:')
  console.log('='.repeat(50))
  
  const existingTables = Object.keys(results).filter(table => results[table].exists)
  const missingTables = Object.keys(results).filter(table => !results[table].exists)
  
  console.log(`✅ Tables that exist (${existingTables.length}):`)
  existingTables.forEach(table => {
    console.log(`   • ${table} (${results[table].recordCount || 0} records)`)
  })
  
  console.log(`\n❌ Tables that are missing (${missingTables.length}):`)
  missingTables.forEach(table => {
    console.log(`   • ${table}`)
  })

  // Check if we have essential data for the assistant
  console.log('\n🎯 ASSISTANT READINESS CHECK:')
  console.log('='.repeat(50))
  
  const hasUserTable = results.profiles?.exists || results.user_profiles?.exists
  const hasProjects = results.projects?.exists
  const hasCompanySettings = results.company_settings?.exists
  const hasSubmissions = results.submissions?.exists
  
  console.log(`User Profile Data: ${hasUserTable ? '✅' : '❌'} ${hasUserTable ? '(Available)' : '(Missing - need profiles or user_profiles)'}`)
  console.log(`Project Data: ${hasProjects ? '✅' : '❌'} ${hasProjects ? `(${results.projects.recordCount} projects)` : '(Missing projects table)'}`)
  console.log(`Company Settings: ${hasCompanySettings ? '✅' : '❌'} ${hasCompanySettings ? '(Available for EIN/address)' : '(Missing - no EIN/address data)'}`)
  console.log(`Submissions Data: ${hasSubmissions ? '✅' : '❌'} ${hasSubmissions ? `(${results.submissions.recordCount} submissions)` : '(Missing submissions table)'}`)
  
  if (hasUserTable && hasProjects) {
    console.log('\n🎉 GOOD NEWS: Core tables exist! Assistant should be able to connect to your data.')
  } else {
    console.log('\n⚠️  WARNING: Missing core tables. Assistant may not have access to your data.')
  }

  // Test sample data fetch if core tables exist
  if (hasProjects) {
    console.log('\n📊 SAMPLE DATA CHECK:')
    console.log('='.repeat(50))
    
    try {
      const { data: sampleProjects } = await supabase
        .from('projects')
        .select('id, name, user_id, funding_request_amount')
        .limit(3)
      
      console.log(`Sample Projects (${sampleProjects?.length || 0}):`)
      sampleProjects?.forEach((project, i) => {
        console.log(`   ${i+1}. ${project.name} ($${project.funding_request_amount?.toLocaleString() || 'unspecified'})`)
      })
    } catch (e) {
      console.log(`Error fetching sample projects: ${e.message}`)
    }
  }

  if (hasCompanySettings) {
    try {
      const { data: sampleCompany } = await supabase
        .from('company_settings')
        .select('organization_name, ein, city, state')
        .limit(1)
        .single()
      
      if (sampleCompany) {
        console.log(`\nSample Company Data:`)
        console.log(`   Organization: ${sampleCompany.organization_name || 'Not set'}`)
        console.log(`   EIN: ${sampleCompany.ein || 'Not set'}`)
        console.log(`   Location: ${sampleCompany.city || 'Not set'}, ${sampleCompany.state || 'Not set'}`)
      }
    } catch (e) {
      console.log(`Company settings exist but no data yet: ${e.message}`)
    }
  }

  return results
}

// Run the check
checkAssistantTables()
  .then(() => {
    console.log('\n✨ Database check complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Database check failed:', error.message)
    process.exit(1)
  })