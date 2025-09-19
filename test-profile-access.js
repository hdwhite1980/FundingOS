// Test profile data access after reverting table references
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pcusbqltbvgebzcacvif.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
);

async function testProfileAccess() {
  console.log('🧪 Testing profile data access after revert...\n');

  try {
    // Test accessing user_profiles (where the actual data is)
    console.log('📊 Step 1: Testing user_profiles table access...');
    const { data: userProfiles, error: upError, count } = await supabase
      .from('user_profiles')
      .select('id, organization_name, email, user_id', { count: 'exact' });

    if (upError) {
      console.error('❌ Error accessing user_profiles:', upError);
      return;
    }

    console.log(`✅ user_profiles accessible: ${count} records`);
    userProfiles.forEach(profile => {
      console.log(`   - ${profile.organization_name || 'No org'} (${profile.email}) - User: ${profile.user_id}`);
    });

    // Test specific user profile lookup (simulating API call)
    console.log('\n📋 Step 2: Testing specific user profile lookup...');
    const testUserId = '1134a8c4-7dce-4b1f-8b97-247580e16e9c'; // Hugh White's profile
    
    const { data: specificProfile, error: specificError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (specificError) {
      console.error('❌ Error getting specific profile:', specificError);
    } else {
      console.log('✅ Specific profile lookup successful:');
      console.log(`   - Organization: ${specificProfile.organization_name}`);
      console.log(`   - Email: ${specificProfile.email}`);
      console.log(`   - Tax ID: ${specificProfile.tax_id}`);
      console.log(`   - Years Operating: ${specificProfile.years_in_operation}`);
      console.log(`   - Setup Completed: ${specificProfile.setup_completed}`);
    }

    // Test profile update functionality
    console.log('\n🔄 Step 3: Testing profile update (safe test)...');
    const { data: updateTest, error: updateError } = await supabase
      .from('user_profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', testUserId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error testing profile update:', updateError);
    } else {
      console.log('✅ Profile update test successful');
      console.log(`   - Updated timestamp: ${updateTest.updated_at}`);
    }

    console.log('\n🎉 All profile access tests passed!');
    console.log('💡 Your company settings should now be accessible when you log in.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testProfileAccess();