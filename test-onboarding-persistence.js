// Test onboarding completion persistence
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'placeholder_url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key'
)

async function testOnboardingPersistence() {
  console.log('Testing onboarding completion persistence...')
  
  try {
    // Get all user profiles
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('id, email, user_role, setup_completed, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Error fetching profiles:', error)
      return
    }
    
    console.log('\nRecent user profiles:')
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. User ${profile.id}`)
      console.log(`   Email: ${profile.email}`)
      console.log(`   Role: ${profile.user_role}`)
      console.log(`   Setup Completed: ${profile.setup_completed}`)
      console.log(`   Created: ${profile.created_at}`)
      console.log(`   Updated: ${profile.updated_at}`)
      console.log('')
    })
    
    // Check for any profiles where setup_completed is false but should be true
    const incompleteProfiles = profiles.filter(p => !p.setup_completed)
    if (incompleteProfiles.length > 0) {
      console.log('Profiles with incomplete setup:')
      incompleteProfiles.forEach(profile => {
        console.log(`- ${profile.email} (${profile.id}) - setup_completed: ${profile.setup_completed}`)
      })
    } else {
      console.log('All recent profiles have setup_completed = true')
    }
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

testOnboardingPersistence()