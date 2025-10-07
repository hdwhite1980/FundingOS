#!/usr/bin/env node
/**
 * Check why company_settings isn't saving
 * Run: node check-company-settings-issue.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCompanySettings() {
  const userId = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
  
  console.log('\n📊 CHECKING COMPANY_SETTINGS TABLE\n')
  
  // 1. Check if constraint exists
  console.log('1️⃣ Checking for unique constraint on user_id...')
  const constraintQuery = await supabase.rpc('exec_sql', {
    query: `
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'public.company_settings'::regclass
        AND conname LIKE '%user_id%'
    `
  })
  
  if (constraintQuery.error) {
    console.log('⚠️ Cannot check constraint via RPC (checking manually...)')
  } else if (!constraintQuery.data || constraintQuery.data.length === 0) {
    console.log('❌ NO UNIQUE CONSTRAINT EXISTS - This is the problem!')
    console.log('   The upsert will fail without this constraint.')
  } else {
    console.log('✅ Unique constraint exists:', constraintQuery.data)
  }
  
  // 2. Check current data in company_settings
  console.log('\n2️⃣ Checking current data in company_settings...')
  const { data: companyData, error: companyError } = await supabase
    .from('company_settings')
    .select('*')
    .eq('user_id', userId)
  
  if (companyError) {
    console.error('❌ Error querying company_settings:', companyError)
  } else if (!companyData || companyData.length === 0) {
    console.log('⚠️ NO DATA in company_settings for your user')
  } else {
    console.log('✅ Found data:', companyData)
  }
  
  // 3. Check user_profiles data
  console.log('\n3️⃣ Checking user_profiles data...')
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, organization_name, ein, tax_id, updated_at')
    .eq('user_id', userId)
    .single()
  
  if (profileError) {
    console.error('❌ Error querying user_profiles:', profileError)
  } else {
    console.log('✅ User profile data:', profileData)
  }
  
  // 4. Test the upsert manually
  console.log('\n4️⃣ Testing manual upsert to company_settings...')
  const testData = {
    user_id: userId,
    organization_name: profileData?.organization_name || 'Test Org',
    updated_at: new Date().toISOString()
  }
  
  console.log('Attempting upsert with data:', testData)
  
  const { data: upsertResult, error: upsertError } = await supabase
    .from('company_settings')
    .upsert(testData, { 
      onConflict: 'user_id',
      ignoreDuplicates: false 
    })
    .select()
  
  if (upsertError) {
    console.error('❌ UPSERT FAILED:', upsertError)
    console.error('   Error details:', JSON.stringify(upsertError, null, 2))
    
    if (upsertError.code === '42P10') {
      console.log('\n💡 ERROR CODE 42P10 = No unique constraint exists!')
      console.log('   You MUST run the SQL script to add the constraint.')
    }
  } else {
    console.log('✅ Upsert succeeded:', upsertResult)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('DIAGNOSIS COMPLETE')
  console.log('='.repeat(60))
  
  if (upsertError && upsertError.code === '42P10') {
    console.log('\n🔧 SOLUTION: Run this SQL in Supabase SQL Editor:')
    console.log('\n' + `
ALTER TABLE public.company_settings 
ADD CONSTRAINT company_settings_user_id_key UNIQUE (user_id);
    `.trim())
    console.log('\nOr run the full script: diagnose_and_fix_profile_persistence.sql\n')
  }
}

checkCompanySettings().catch(console.error)
