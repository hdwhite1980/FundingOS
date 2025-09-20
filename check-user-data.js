import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Checking user profile data for assistant context...\n')

async function checkUserData() {
  try {
    // Check user_profiles data
    console.log('📊 USER PROFILES:')
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(3)

    profiles?.forEach((profile, i) => {
      console.log(`   ${i+1}. User: ${profile.full_name || profile.email || 'Unnamed'}`)
      console.log(`      Organization: ${profile.organization_name || 'Not set'}`)
      console.log(`      Address: ${profile.city || 'Not set'}, ${profile.state || 'Not set'}`)
      console.log(`      User ID: ${profile.user_id}`)
      console.log()
    })

    // Check company_settings data  
    console.log('🏢 COMPANY SETTINGS:')
    const { data: companies } = await supabase
      .from('company_settings')
      .select('*')
      .limit(3)

    if (companies?.length) {
      companies.forEach((company, i) => {
        console.log(`   ${i+1}. Company: ${company.organization_name || 'Unnamed'}`)
        console.log(`      EIN: ${company.ein || 'Not set'}`)
        console.log(`      Address: ${company.address_line1 || 'Not set'}`)
        console.log(`      City, State: ${company.city || 'Not set'}, ${company.state || 'Not set'} ${company.zip_code || ''}`)
        console.log(`      User ID: ${company.user_id}`)
        console.log()
      })
    } else {
      console.log('   No company settings found. Users may need to add EIN/address info.')
    }

    // Check projects for specific user
    console.log('📁 RECENT PROJECTS:')
    const { data: projects } = await supabase
      .from('projects')
      .select('name, user_id, funding_request_amount, project_categories, created_at')
      .order('created_at', { ascending: false })
      .limit(3)

    projects?.forEach((project, i) => {
      console.log(`   ${i+1}. ${project.name}`)
      console.log(`      Amount: $${project.funding_request_amount?.toLocaleString() || 'Not specified'}`)
      console.log(`      Categories: ${Array.isArray(project.project_categories) ? project.project_categories.join(', ') : 'Not set'}`)
      console.log(`      User ID: ${project.user_id}`)
      console.log()
    })

    // Check submissions
    console.log('📄 RECENT SUBMISSIONS:')
    const { data: submissions } = await supabase
      .from('submissions')
      .select('id, user_id, status, opportunity_title, created_at')
      .order('created_at', { ascending: false })
      .limit(3)

    submissions?.forEach((sub, i) => {
      console.log(`   ${i+1}. ${sub.opportunity_title || 'Untitled'}`)
      console.log(`      Status: ${sub.status || 'Unknown'}`)
      console.log(`      User ID: ${sub.user_id}`)
      console.log()
    })

    // Test assistant context for first user
    if (profiles?.[0]) {
      const testUserId = profiles[0].user_id
      console.log(`🤖 TESTING ASSISTANT CONTEXT for User: ${profiles[0].full_name || profiles[0].email}`)
      console.log(`   User ID: ${testUserId}`)
      
      // Count their data
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUserId)

      const { count: submissionCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', testUserId)

      console.log(`   Projects: ${projectCount || 0}`)
      console.log(`   Submissions: ${submissionCount || 0}`)
      
      console.log('\n✅ This user data will be available to the assistant!')
    }

  } catch (error) {
    console.error('❌ Error checking data:', error.message)
  }
}

checkUserData()
  .then(() => {
    console.log('\n✨ Data check complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Failed:', error.message)
    process.exit(1)
  })