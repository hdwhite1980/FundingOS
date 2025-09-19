// Investigation script for lost profiles data - Direct queries
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pcusbqltbvgebzcacvif.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
);

async function investigateLostProfilesSimple() {
  console.log('🔍 Investigating lost profiles data...\n');

  try {
    // 1. Check if there are any rows in profiles table
    console.log('📊 Step 1: Checking profiles table data...');
    const { data: profilesData, error: profilesError, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (profilesError) {
      console.error('❌ Error querying profiles:', profilesError);
    } else {
      console.log(`✅ Found ${count || 0} rows in profiles table`);
      if (profilesData && profilesData.length > 0) {
        console.log('🔍 Sample profile data:');
        profilesData.slice(0, 3).forEach(profile => {
          console.log(`   - ID: ${profile.id}`);
          console.log(`   - User ID: ${profile.user_id}`);
          console.log(`   - Organization: ${profile.organization_name || 'N/A'}`);
          console.log(`   - Created: ${profile.created_at}`);
          console.log('   ---');
        });
      }
    }

    // 2. Check projects table to see user associations
    console.log('\n📋 Step 2: Checking projects table for user references...');
    const { data: projectUsers, error: projectError } = await supabase
      .from('projects')
      .select('user_id, name, created_at')
      .limit(10);

    if (!projectError && projectUsers) {
      console.log(`✅ Found ${projectUsers.length} projects with user references:`);
      const uniqueUsers = [...new Set(projectUsers.map(p => p.user_id))];
      console.log(`   - Unique user IDs in projects: ${uniqueUsers.length}`);
      
      // Show user IDs that have projects but might not have profiles
      for (let userId of uniqueUsers.slice(0, 3)) {
        const userProjects = projectUsers.filter(p => p.user_id === userId);
        console.log(`   - User ${userId}: ${userProjects.length} projects`);
        
        // Check if this user has a profile
        const { data: userProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (profileCheckError) {
          console.log(`     ❌ No profile found for user ${userId}: ${profileCheckError.message}`);
        } else {
          console.log(`     ✅ Profile exists for user ${userId}`);
        }
      }
    }

    // 3. Check if there's a user_profiles table (from old naming)
    console.log('\n🔍 Step 3: Checking for data in potential user_profiles table...');
    try {
      const { data: oldProfiles, error: oldProfilesError, count: oldCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .limit(5);
      
      if (!oldProfilesError && oldProfiles) {
        console.log(`⚠️ Found ${oldCount || 0} records in user_profiles table!`);
        if (oldProfiles.length > 0) {
          console.log('🔍 Sample data from user_profiles:');
          oldProfiles.forEach(profile => {
            console.log(`   - ID: ${profile.id}`);
            console.log(`   - User ID: ${profile.user_id}`);
            console.log(`   - Organization: ${profile.organization_name || 'N/A'}`);
            console.log('   ---');
          });
        }
      }
    } catch (userProfilesError) {
      console.log('✅ No user_profiles table found (expected after migration)');
    }

    // 4. Check companies table
    console.log('\n🏢 Step 4: Checking companies table...');
    const { data: companiesData, error: companiesError, count: companiesCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .limit(5);

    if (!companiesError && companiesData) {
      console.log(`✅ Found ${companiesCount || 0} records in companies table`);
      if (companiesData.length > 0) {
        console.log('🔍 Sample company data:');
        companiesData.forEach(company => {
          console.log(`   - ID: ${company.id}`);
          console.log(`   - User ID: ${company.user_id}`);
          console.log(`   - Name: ${company.name}`);
          console.log('   ---');
        });
      }
    }

    // 5. Try to get auth users (this might fail with service role)
    console.log('\n👥 Step 5: Attempting to check auth users...');
    try {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.log('⚠️ Cannot access auth.users with service role:', usersError.message);
      } else {
        console.log(`✅ Found ${usersData.users.length} users in auth`);
        usersData.users.slice(0, 3).forEach(user => {
          console.log(`   - ID: ${user.id}, Email: ${user.email}`);
        });
      }
    } catch (authError) {
      console.log('⚠️ Auth admin access not available:', authError.message);
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

investigateLostProfilesSimple();