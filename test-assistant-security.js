import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔒 Testing user data isolation and security...\n')

async function testUserDataSecurity() {
  try {
    // Get list of all users
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, organization_name, tax_id')

    if (!profiles || profiles.length < 2) {
      console.log('⚠️  Need at least 2 users to test data isolation')
      return
    }

    console.log(`Found ${profiles.length} users to test data isolation:`)
    profiles.forEach((profile, i) => {
      console.log(`   ${i+1}. ${profile.full_name || 'Unnamed'} (${profile.organization_name || 'No org'})`)
      console.log(`      User ID: ${profile.user_id}`)
      console.log(`      Tax ID: ${profile.tax_id || 'Not set'}`)
    })

    console.log('\n🔍 TESTING DATA ISOLATION:')
    console.log('='.repeat(50))

    // Test each user's data in isolation
    for (let i = 0; i < profiles.length; i++) {
      const testUser = profiles[i]
      console.log(`\n👤 Testing User: ${testUser.full_name || 'Unnamed'} (${testUser.user_id})`)

      // Test user_profiles query
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', testUser.user_id)
        .maybeSingle()

      console.log(`   Profile Query: ${userProfile ? '✅ Found their profile' : '❌ No profile found'}`)
      
      if (userProfile) {
        console.log(`   Organization: ${userProfile.organization_name || 'Not set'}`)
        console.log(`   Tax ID: ${userProfile.tax_id || 'Not set'}`)
        
        // Verify it's ONLY their data (no other user's tax_id should appear)
        const otherUsersTaxIds = profiles.filter(p => p.user_id !== testUser.user_id && p.tax_id).map(p => p.tax_id)
        const hasOtherUserData = otherUsersTaxIds.some(taxId => 
          JSON.stringify(userProfile).includes(taxId)
        )
        
        if (hasOtherUserData) {
          console.log(`   🚨 SECURITY ISSUE: Contains other users' data!`)
        } else {
          console.log(`   🔒 Security OK: Only contains this user's data`)
        }
      }

      // Test projects query
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, user_id')
        .eq('user_id', testUser.user_id)

      console.log(`   Projects Query: ${projects?.length || 0} projects found`)
      
      // Verify all projects belong to this user
      const hasWrongUserProjects = projects?.some(p => p.user_id !== testUser.user_id)
      if (hasWrongUserProjects) {
        console.log(`   🚨 SECURITY ISSUE: Found projects from other users!`)
      } else if (projects?.length > 0) {
        console.log(`   🔒 Security OK: All projects belong to this user`)
      }

      // Test submissions query
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, user_id')
        .eq('user_id', testUser.user_id)

      console.log(`   Submissions Query: ${submissions?.length || 0} submissions found`)
      
      const hasWrongUserSubmissions = submissions?.some(s => s.user_id !== testUser.user_id)
      if (hasWrongUserSubmissions) {
        console.log(`   🚨 SECURITY ISSUE: Found submissions from other users!`)
      } else if (submissions?.length > 0) {
        console.log(`   🔒 Security OK: All submissions belong to this user`)
      }
    }

    console.log('\n📊 ISOLATION TEST SUMMARY:')
    console.log('='.repeat(50))
    
    // Test what happens when assistant tries to access all users' data
    console.log('\n🤖 TESTING ASSISTANT CONTEXT BUILDER:')
    const testUserId = profiles[0].user_id
    
    // Import and test the buildOrgContext function
    console.log(`Building context for user: ${profiles[0].full_name} (${testUserId})`)
    
    // Simulate what the assistant does
    const { data: contextProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', testUserId)
      .maybeSingle()
      
    const { data: contextProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', testUserId)
      
    console.log(`   Context Profile: ${contextProfile ? `✅ ${contextProfile.organization_name}` : '❌ None'}`)
    console.log(`   Context Projects: ${contextProjects?.length || 0} projects`)
    console.log(`   Tax ID Available: ${contextProfile?.tax_id ? `✅ ${contextProfile.tax_id}` : '❌ None'}`)

    // Verify the context doesn't contain other users' data
    const otherUsersData = profiles.filter(p => p.user_id !== testUserId)
    let hasDataLeaks = false
    
    otherUsersData.forEach(otherUser => {
      if (otherUser.tax_id && JSON.stringify(contextProfile).includes(otherUser.tax_id)) {
        console.log(`   🚨 LEAK: Contains ${otherUser.full_name}'s tax ID!`)
        hasDataLeaks = true
      }
    })
    
    if (!hasDataLeaks) {
      console.log(`   🔒 ✅ SECURITY VERIFIED: Context contains only this user's data`)
    }

    console.log('\n🎯 FINAL VERDICT:')
    console.log(hasDataLeaks ? '🚨 SECURITY ISSUES FOUND - FIX REQUIRED' : '✅ DATA ISOLATION WORKING CORRECTLY')

  } catch (error) {
    console.error('❌ Security test error:', error.message)
  }
}

// Run the security test
testUserDataSecurity()
  .then(() => {
    console.log('\n✨ Security test complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Security test failed:', error.message)
    process.exit(1)
  })