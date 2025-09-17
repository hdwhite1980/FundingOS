// Test if user_profiles table exists and create it if needed
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testUserProfilesTable() {
  console.log('Testing user_profiles table existence...');
  
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('user_profiles table error:', error.message);
      console.log('❌ user_profiles table does not exist or has issues');
      
      if (error.code === 'PGRST106' || error.message.includes('relation "user_profiles" does not exist')) {
        console.log('🔧 Need to create user_profiles table');
      }
    } else {
      console.log('✅ user_profiles table exists and is accessible');
      console.log('Found records:', data?.length || 0);
    }
  } catch (err) {
    console.error('Test failed:', err);
  }
}

// Also test opportunities table updated_at column
async function testOpportunitiesUpdatedAt() {
  console.log('\nTesting opportunities table updated_at column...');
  
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, updated_at, last_updated')
      .limit(1);
    
    if (error) {
      console.error('opportunities updated_at error:', error.message);
      if (error.code === 'PGRST204') {
        console.log('❌ Schema cache issue - updated_at column not recognized');
        console.log('🔧 Need to refresh Supabase schema cache');
      }
    } else {
      console.log('✅ opportunities table updated_at column accessible');
      if (data && data.length > 0) {
        console.log('Sample record:', {
          id: data[0].id,
          updated_at: data[0].updated_at,
          last_updated: data[0].last_updated
        });
      }
    }
  } catch (err) {
    console.error('Opportunities test failed:', err);
  }
}

async function main() {
  await testUserProfilesTable();
  await testOpportunitiesUpdatedAt();
}

main().catch(console.error);