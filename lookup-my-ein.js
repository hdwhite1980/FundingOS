const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase admin client with actual production values
const supabaseUrl = 'https://qsfyasvsewexmqeiwrxp.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnlhc3ZzZXdleG1xZWl3cnhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDUxMzg5NSwiZXhwIjoyMDQ2MDg5ODk1fQ.GnYPDW_Aw6HHgdEPqKv13FmJZNqsC2eL4U-8IuYBc2I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findUserEIN() {
  console.log('\n🔍 Looking up your EIN information...\n')
  
  try {
    // Check user_profiles table for EIN data
    console.log('📊 Checking user_profiles table...')
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, organization_name, ein, tax_id, organization_type, email')
      .not('ein', 'is', null)
      .or('ein.neq.null,tax_id.neq.null')

    if (profileError) {
      console.error('❌ Error fetching user profiles:', profileError)
    } else if (profiles && profiles.length > 0) {
      console.log('✅ Found EIN information in user_profiles:')
      profiles.forEach((profile, index) => {
        console.log(`\n👤 Profile ${index + 1}:`)
        console.log(`   Organization: ${profile.organization_name || profile.full_name || 'Not specified'}`)
        console.log(`   EIN: ${profile.ein || 'Not set'}`)
        console.log(`   Tax ID: ${profile.tax_id || 'Not set'}`)
        console.log(`   Type: ${profile.organization_type || 'Not specified'}`)
        console.log(`   Email: ${profile.email || 'Not specified'}`)
        console.log(`   User ID: ${profile.user_id}`)
      })
    } else {
      console.log('⚠️ No EIN found in user_profiles table')
    }

    // Check company_settings table for EIN data
    console.log('\n📊 Checking company_settings table...')
    const { data: companies, error: companyError } = await supabase
      .from('company_settings')
      .select('user_id, organization_name, ein, tax_id, duns_number, cage_code, organization_type, contact_person, contact_email')
      .not('ein', 'is', null)
      .or('ein.neq.null,tax_id.neq.null')

    if (companyError) {
      console.error('❌ Error fetching company settings:', companyError)
    } else if (companies && companies.length > 0) {
      console.log('✅ Found EIN information in company_settings:')
      companies.forEach((company, index) => {
        console.log(`\n🏢 Company ${index + 1}:`)
        console.log(`   Organization: ${company.organization_name || 'Not specified'}`)
        console.log(`   EIN: ${company.ein || 'Not set'}`)
        console.log(`   Tax ID: ${company.tax_id || 'Not set'}`)
        console.log(`   DUNS: ${company.duns_number || 'Not set'}`)
        console.log(`   CAGE Code: ${company.cage_code || 'Not set'}`)
        console.log(`   Type: ${company.organization_type || 'Not specified'}`)
        console.log(`   Contact: ${company.contact_person || 'Not specified'}`)
        console.log(`   Email: ${company.contact_email || 'Not specified'}`)
        console.log(`   User ID: ${company.user_id}`)
      })
    } else {
      console.log('⚠️ No EIN found in company_settings table')
    }

    // If no EIN found, show how to add it
    if ((!profiles || profiles.length === 0) && (!companies || companies.length === 0)) {
      console.log('\n❓ No EIN information found in your profile.')
      console.log('\n💡 To add your EIN information:')
      console.log('1. Go to your profile/account settings in the WALI-OS app')
      console.log('2. Update your organization information including:')
      console.log('   - EIN (Employer Identification Number)')
      console.log('   - Tax ID')
      console.log('   - Organization name and type')
      console.log('3. Save your changes')
      console.log('\n📝 Your EIN will then be used by the AI for automatic form prefilling!')
    }

    // Summary
    const totalEINs = (profiles?.length || 0) + (companies?.length || 0)
    console.log('\n' + '='.repeat(50))
    console.log(`📋 Summary: Found ${totalEINs} organization(s) with EIN information`)
    
    if (totalEINs > 0) {
      console.log('✅ Your EIN data is available for AI application generation')
      console.log('🤖 The AI assistant can now prefill forms with your organization details')
    } else {
      console.log('⚠️ Consider adding your EIN to improve AI application assistance')
    }

  } catch (error) {
    console.error('❌ Error looking up EIN information:', error.message)
  }
}

// Run the EIN lookup
if (require.main === module) {
  findUserEIN()
}

module.exports = { findUserEIN }