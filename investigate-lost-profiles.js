// Investigation script for lost profiles data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pcusbqltbvgebzcacvif.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
);

async function investigateLostProfiles() {
  console.log('🔍 Investigating lost profiles data...\n');

  try {
    // 1. Check if profiles table exists and get its structure
    console.log('📋 Step 1: Checking profiles table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default 
          FROM information_schema.columns 
          WHERE table_name = 'profiles' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });

    if (tableError) {
      console.error('❌ Error checking table structure:', tableError);
      return;
    }

    console.log('✅ Profiles table columns:', tableInfo.length);
    tableInfo.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 2. Check if there are any rows in profiles table
    console.log('\n📊 Step 2: Checking for any profiles data...');
    const { data: profilesData, error: profilesError, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (profilesError) {
      console.error('❌ Error querying profiles:', profilesError);
    } else {
      console.log(`✅ Found ${count} rows in profiles table`);
      if (profilesData && profilesData.length > 0) {
        console.log('🔍 Sample profile data:');
        profilesData.slice(0, 3).forEach(profile => {
          console.log(`   - ID: ${profile.id}, User: ${profile.user_id}, Company: ${profile.organization_name || 'N/A'}`);
        });
      }
    }

    // 3. Check auth.users table to see if users still exist
    console.log('\n👥 Step 3: Checking auth.users table...');
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error checking users:', usersError);
    } else {
      console.log(`✅ Found ${usersData.users.length} users in auth.users`);
      usersData.users.slice(0, 5).forEach(user => {
        console.log(`   - ID: ${user.id}, Email: ${user.email}, Created: ${user.created_at}`);
      });
    }

    // 4. Check if there's a user_profiles table (old naming)
    console.log('\n🔍 Step 4: Checking for old user_profiles table...');
    const { data: oldTableCheck, error: oldTableError } = await supabase
      .rpc('sql', {
        query: `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_profiles'
          ) as table_exists;
        `
      });

    if (!oldTableError && oldTableCheck[0]?.table_exists) {
      console.log('⚠️ Found old user_profiles table! Checking data...');
      const { data: oldProfiles, error: oldProfilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(5);
      
      if (!oldProfilesError && oldProfiles) {
        console.log(`🔍 Found ${oldProfiles.length} records in user_profiles table`);
        oldProfiles.forEach(profile => {
          console.log(`   - ID: ${profile.id}, User: ${profile.user_id}, Company: ${profile.organization_name || 'N/A'}`);
        });
      }
    } else {
      console.log('✅ No old user_profiles table found');
    }

    // 5. Check projects table to see user associations
    console.log('\n📋 Step 5: Checking projects table for user references...');
    const { data: projectUsers, error: projectError } = await supabase
      .from('projects')
      .select('user_id, name, created_at')
      .limit(10);

    if (!projectError && projectUsers) {
      console.log(`✅ Found ${projectUsers.length} projects with user references:`);
      const uniqueUsers = [...new Set(projectUsers.map(p => p.user_id))];
      console.log(`   - Unique user IDs in projects: ${uniqueUsers.length}`);
      uniqueUsers.slice(0, 5).forEach(userId => {
        const userProjects = projectUsers.filter(p => p.user_id === userId);
        console.log(`   - User ${userId}: ${userProjects.length} projects`);
      });
    }

    // 6. Check for any recent schema changes or migrations
    console.log('\n🔄 Step 6: Checking for recent schema changes...');
    const { data: migrations, error: migrationError } = await supabase
      .rpc('sql', {
        query: `
          SELECT schemaname, tablename, last_vacuum, last_autovacuum, last_analyze, last_autoanalyze 
          FROM pg_stat_user_tables 
          WHERE tablename IN ('profiles', 'user_profiles')
          ORDER BY last_autovacuum DESC NULLS LAST;
        `
      });

    if (!migrationError && migrations) {
      console.log('📊 Table statistics:');
      migrations.forEach(stat => {
        console.log(`   - ${stat.tablename}: last analyze ${stat.last_analyze || 'never'}`);
      });
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

investigateLostProfiles();