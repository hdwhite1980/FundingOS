#!/usr/bin/env node
/**
 * Test the actual save flow end-to-end
 * Run: node test-save-flow.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testSaveFlow() {
  const userId = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
  
  console.log('\n🧪 TESTING END-TO-END SAVE FLOW\n')
  
  // 1. Get current state
  console.log('1️⃣ Getting current profile state...')
  const { data: before } = await supabase
    .from('user_profiles')
    .select('full_name, organization_name, updated_at')
    .eq('user_id', userId)
    .single()
  
  console.log('Before:', before)
  
  // 2. Simulate AccountSettingsModal save (just update full_name)
  console.log('\n2️⃣ Simulating profile update (like AccountSettingsModal does)...')
  const testUpdate = {
    full_name: 'Hugh White TEST ' + Date.now(),
    updated_at: new Date().toISOString()
  }
  
  const { data: updated, error: updateError } = await supabase
    .from('user_profiles')
    .update(testUpdate)
    .eq('user_id', userId)
    .select()
    .single()
  
  if (updateError) {
    console.error('❌ Update failed:', updateError)
    return
  }
  
  console.log('✅ Update succeeded:', updated.full_name)
  
  // 3. Immediately read it back (like app/page.js does on refresh)
  console.log('\n3️⃣ Reading back (simulating page refresh)...')
  const { data: refetched } = await supabase
    .from('user_profiles')
    .select('full_name, organization_name, updated_at')
    .eq('user_id', userId)
    .single()
  
  console.log('After refetch:', refetched)
  
  // 4. Compare
  console.log('\n4️⃣ Comparison:')
  console.log('  Original:', before.full_name)
  console.log('  Updated to:', updated.full_name)
  console.log('  Refetched:', refetched.full_name)
  
  if (refetched.full_name === updated.full_name) {
    console.log('\n✅ SUCCESS: Data persists correctly!')
    console.log('   The save → refetch flow is working perfectly.')
    console.log('\n💡 If you still see old data in your browser:')
    console.log('   1. Hard refresh: Ctrl + Shift + R')
    console.log('   2. Clear browser cache')
    console.log('   3. Try incognito mode')
    console.log('   4. Wait for Vercel deployment to complete')
  } else {
    console.log('\n❌ PROBLEM: Data not persisting!')
    console.log('   This would indicate a database issue.')
  }
  
  // 5. Restore original value
  console.log('\n5️⃣ Restoring original value...')
  await supabase
    .from('user_profiles')
    .update({ full_name: before.full_name })
    .eq('user_id', userId)
  
  console.log('✅ Restored to:', before.full_name)
}

testSaveFlow().catch(console.error)
