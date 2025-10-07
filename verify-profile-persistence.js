#!/usr/bin/env node
/**
 * Check what's actually in the database after page refresh
 * Run: node verify-profile-persistence.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function verify() {
  const userId = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
  
  console.log('\n🔍 CHECKING ACTUAL DATABASE STATE\n')
  
  // 1. What does user_profiles have RIGHT NOW?
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, email, organization_name, updated_at')
    .eq('user_id', userId)
    .single()
  
  console.log('📄 user_profiles table:')
  console.log(JSON.stringify(profile, null, 2))
  
  // 2. What does company_settings have RIGHT NOW?
  const { data: company } = await supabase
    .from('company_settings')
    .select('user_id, organization_name, ein, updated_at')
    .eq('user_id', userId)
    .single()
  
  console.log('\n🏢 company_settings table:')
  console.log(JSON.stringify(company, null, 2))
  
  // 3. What would the API return?
  console.log('\n🌐 Simulating API call /api/user/profile/[userId]...')
  const { data: apiProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  
  console.log(`Full name in API response: "${apiProfile?.full_name}"`)
  console.log(`Organization: "${apiProfile?.organization_name}"`)
  console.log(`Updated at: ${apiProfile?.updated_at}`)
  
  console.log('\n✅ If full_name shows "Hugh White", the data IS persisting!')
  console.log('✅ If organization shows your company name, the data IS persisting!')
  console.log('\n💡 If the data is correct here but wrong in your browser:')
  console.log('   - Clear browser cache (Ctrl+Shift+Del)')
  console.log('   - Hard refresh (Ctrl+Shift+R or Ctrl+F5)')
  console.log('   - Or try incognito mode')
}

verify().catch(console.error)
