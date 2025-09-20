const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase admin client
const supabaseUrl = 'https://qsfyasvsewexmqeiwrxp.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnlhc3ZzZXdleG1xZWl3cnhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDUxMzg5NSwiZXhwIjoyMDQ2MDg5ODk1fQ.GnYPDW_Aw6HHgdEPqKv13FmJZNqsC2eL4U-8IuYBc2I'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTaxIdData() {
  console.log('\n🔍 Checking for tax_id data specifically...\n')
  
  try {
    // Check user_profiles table for ANY tax_id data
    console.log('📊 Checking ALL user_profiles for tax_id field...')
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, organization_name, ein, tax_id, organization_type, email')
      .not('tax_id', 'is', null)

    if (profileError) {
      console.error('❌ Error fetching user profiles:', profileError)
    } else {
      console.log(`✅ Found ${profiles?.length || 0} profiles with tax_id data`)
      profiles?.forEach((profile, index) => {
        console.log(`\n👤 Profile ${index + 1}:`)
        console.log(`   Organization: ${profile.organization_name || profile.full_name || 'Not specified'}`)
        console.log(`   Tax ID: ${profile.tax_id}`)
        console.log(`   EIN: ${profile.ein || 'Not set'}`)
        console.log(`   User ID: ${profile.user_id}`)
      })
    }

    // Check company_settings table for tax_id data
    console.log('\n📊 Checking ALL company_settings for tax_id field...')
    const { data: companies, error: companyError } = await supabase
      .from('company_settings')
      .select('user_id, organization_name, ein, tax_id, organization_type, contact_person')
      .not('tax_id', 'is', null)

    if (companyError) {
      console.error('❌ Error fetching company settings:', companyError)
    } else {
      console.log(`✅ Found ${companies?.length || 0} companies with tax_id data`)
      companies?.forEach((company, index) => {
        console.log(`\n🏢 Company ${index + 1}:`)
        console.log(`   Organization: ${company.organization_name || 'Not specified'}`)
        console.log(`   Tax ID: ${company.tax_id}`)
        console.log(`   EIN: ${company.ein || 'Not set'}`)
        console.log(`   User ID: ${company.user_id}`)
      })
    }

    // Check ALL records to see if any have data at all
    console.log('\n📊 Checking for ANY data in user_profiles...')
    const { data: allProfiles, error: allProfileError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, organization_name, ein, tax_id')
      .limit(10)

    if (!allProfileError && allProfiles?.length > 0) {
      console.log(`✅ Found ${allProfiles.length} total user profiles:`)
      allProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ${profile.full_name || profile.organization_name || 'No name'} (EIN: ${profile.ein || 'none'}, Tax ID: ${profile.tax_id || 'none'})`)
      })
    }

    console.log('\n📊 Checking for ANY data in company_settings...')
    const { data: allCompanies, error: allCompanyError } = await supabase
      .from('company_settings')
      .select('user_id, organization_name, ein, tax_id')
      .limit(10)

    if (!allCompanyError && allCompanies?.length > 0) {
      console.log(`✅ Found ${allCompanies.length} total company settings:`)
      allCompanies.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.organization_name || 'No name'} (EIN: ${company.ein || 'none'}, Tax ID: ${company.tax_id || 'none'})`)
      })
    }

  } catch (error) {
    console.error('❌ Error checking tax_id data:', error.message)
  }
}

// Run the check
if (require.main === module) {
  checkTaxIdData()
}