// Test if sync routes can now insert opportunities using service role client
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'placeholder_url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function testServiceRoleAccess() {
  console.log('Testing service role access to opportunities table...')
  
  try {
    // Test 1: Read access
    console.log('\n1. Testing read access...')
    const { data: opportunities, error: readError } = await supabaseServiceRole
      .from('opportunities')
      .select('id, title, source')
      .limit(5)
    
    if (readError) {
      console.error('Read error:', readError)
      return
    }
    
    console.log(`✓ Successfully read ${opportunities.length} opportunities`)
    
    // Test 2: Insert access with a test opportunity
    console.log('\n2. Testing insert access...')
    const testOpportunity = {
      external_id: `test-${Date.now()}`,
      title: 'Test Opportunity for Service Role',
      description: 'Testing service role insert capabilities',
      source: 'grants_gov',
      sponsor: 'Test Agency',
      deadline_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      url: 'https://example.com/test',
      amount_min: 10000,
      amount_max: 50000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: inserted, error: insertError } = await supabaseServiceRole
      .from('opportunities')
      .upsert([testOpportunity], { 
        onConflict: 'external_id,source',
        ignoreDuplicates: false 
      })
      .select('id, title, external_id')
    
    if (insertError) {
      console.error('Insert error:', insertError)
      return
    }
    
    console.log(`✓ Successfully inserted test opportunity:`, inserted)
    
    // Test 3: Clean up - delete the test opportunity
    console.log('\n3. Cleaning up test data...')
    const { error: deleteError } = await supabaseServiceRole
      .from('opportunities')
      .delete()
      .eq('external_id', testOpportunity.external_id)
    
    if (deleteError) {
      console.error('Delete error:', deleteError)
    } else {
      console.log('✓ Successfully cleaned up test opportunity')
    }
    
    console.log('\n🎉 Service role client has full access to opportunities table!')
    console.log('The sync operations should now work without RLS policy violations.')
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

testServiceRoleAccess()