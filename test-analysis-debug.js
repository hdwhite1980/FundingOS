// Test analysis functionality with debug output
const { supabase } = require('./lib/supabase')

async function testAnalysisDebug() {
  console.log('🧪 Testing Analysis Debug...')
  
  // Get a real user ID from the database
  const { data: users, error: userError } = await supabase
    .from('user_profiles')
    .select('user_id, organization_type, organization_name')
    .limit(1)
  
  if (userError || !users?.length) {
    console.error('❌ Could not get user:', userError)
    return
  }
  
  const testUserId = users[0].user_id
  console.log('✅ Using user:', testUserId, 'org type:', users[0].organization_type)
  
  // Test the actual getUserContext function logic
  console.log('📊 Testing user context retrieval...')
  
  try {
    // Replicate the getUserContext logic
    const [
      profileResult,
      projectsResult,
      opportunitiesResult
    ] = await Promise.allSettled([
      supabase.from('user_profiles').select('*').eq('user_id', testUserId).maybeSingle(),
      supabase.from('projects').select('*').eq('user_id', testUserId).limit(3),
      supabase.from('opportunities').select('*').limit(5)
    ])

    const profile = profileResult.status === 'fulfilled' ? profileResult.value.data || null : null
    const projects = projectsResult.status === 'fulfilled' ? projectsResult.value.data || [] : []
    const opportunities = opportunitiesResult.status === 'fulfilled' ? opportunitiesResult.value.data || [] : []
    
    console.log('📋 Context retrieved:')
    console.log('  - Profile:', !!profile, profile?.organization_type || 'no org type')
    console.log('  - Projects:', projects.length)
    console.log('  - Opportunities:', opportunities.length)
    
    if (!profile) {
      console.error('❌ No profile found - this would cause null errors in analysis')
      return
    }
    
    // Test the scoring function directly
    if (projects.length > 0 && opportunities.length > 0) {
      console.log('🎯 Testing scoring function...')
      
      const testProject = projects[0]
      const testOpportunity = opportunities[0]
      
      console.log('Test project:', {
        name: testProject.name,
        project_type: testProject.project_type,
        funding_needed: testProject.funding_needed
      })
      
      console.log('Test opportunity:', {
        title: testOpportunity.title,
        organization_types: testOpportunity.organization_types,
        amount_min: testOpportunity.amount_min,
        amount_max: testOpportunity.amount_max
      })
      
      console.log('Profile for scoring:', {
        organization_type: profile.organization_type,
        organization_name: profile.organization_name,
        small_business: profile.small_business,
        woman_owned: profile.woman_owned,
        minority_owned: profile.minority_owned
      })
      
      // Simple scoring logic test
      let testScore = 0
      
      // Organization type match test
      if (testOpportunity.organization_types && testOpportunity.organization_types.length > 0) {
        if (!profile.organization_type || profile.organization_type === 'unknown') {
          console.log('  ❌ Org type issue: not specified')
          testScore += 0
        } else if (testOpportunity.organization_types.includes(profile.organization_type)) {
          console.log('  ✅ Org type match:', profile.organization_type)
          testScore += 25
        } else if (testOpportunity.organization_types.includes('all')) {
          console.log('  ✅ Org type: accepts all')
          testScore += 20
        } else {
          console.log('  ❌ Org type mismatch:', profile.organization_type, 'vs', testOpportunity.organization_types)
          testScore += 0
        }
      } else {
        console.log('  ➡️ No org type requirements')
        testScore += 15
      }
      
      console.log('  Final test score:', testScore)
    }
    
  } catch (error) {
    console.error('❌ Error in analysis test:', error)
  }
}

testAnalysisDebug().catch(console.error)