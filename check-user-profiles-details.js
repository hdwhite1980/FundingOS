import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Checking user_profiles table structure and EIN/tax_id data...\n')

async function checkUserProfilesDetails() {
  try {
    // Get all user_profiles data to see what columns actually exist
    console.log('📊 USER PROFILES DATA:')
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')

    if (error) {
      console.error('Error fetching user profiles:', error)
      return
    }

    console.log(`Found ${profiles.length} user profiles:`)
    console.log('='.repeat(50))

    profiles.forEach((profile, i) => {
      console.log(`${i + 1}. USER PROFILE:`)
      console.log(`   User ID: ${profile.user_id}`)
      console.log(`   Name: ${profile.full_name || 'Not set'}`)
      console.log(`   Email: ${profile.email || 'Not set'}`)
      console.log(`   Organization: ${profile.organization_name || 'Not set'}`)
      console.log(`   Company: ${profile.company || 'Not set'}`)
      
      // Check for EIN/tax_id fields
      if (profile.tax_id) {
        console.log(`   ✅ TAX ID: ${profile.tax_id}`)
      } else {
        console.log(`   ❌ Tax ID: Not set`)
      }
      
      if (profile.ein) {
        console.log(`   ✅ EIN: ${profile.ein}`)
      } else {
        console.log(`   ❌ EIN: Not set`)
      }
      
      // Check address fields
      const hasAddress = profile.address_line1 || profile.city || profile.state
      if (hasAddress) {
        console.log(`   ✅ ADDRESS: ${profile.address_line1 || ''} ${profile.city || ''}, ${profile.state || ''} ${profile.zip_code || ''}`)
      } else {
        console.log(`   ❌ Address: Not set`)
      }
      
      console.log(`   Phone: ${profile.phone || 'Not set'}`)
      console.log(`   Country: ${profile.country || 'Not set'}`)
      
      // Show all available columns
      console.log(`   Available columns: ${Object.keys(profile).join(', ')}`)
      console.log('')
    })

    // Check if user_profiles has tax_id/EIN data that company_settings doesn't
    const profilesWithTaxData = profiles.filter(p => p.tax_id || p.ein)
    console.log(`\n💼 EIN/TAX DATA SUMMARY:`)
    console.log(`   Profiles with tax_id: ${profiles.filter(p => p.tax_id).length}`)
    console.log(`   Profiles with EIN: ${profiles.filter(p => p.ein).length}`)
    
    if (profilesWithTaxData.length > 0) {
      console.log(`\n✅ GOOD NEWS: Found EIN/tax_id data in user_profiles!`)
      console.log(`The assistant should be able to answer EIN questions using this data.`)
    } else {
      console.log(`\n⚠️  No EIN/tax_id data found in user_profiles either.`)
    }

  } catch (error) {
    console.error('❌ Error checking user profiles:', error.message)
  }
}

// Run the detailed check
checkUserProfilesDetails()
  .then(() => {
    console.log('\n✨ User profiles analysis complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error.message)
    process.exit(1)
  })