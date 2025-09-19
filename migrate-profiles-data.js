// Migrate user profiles data from user_profiles to profiles table
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pcusbqltbvgebzcacvif.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
);

async function migrateProfilesToNewTable() {
  console.log('🔄 Migrating user profiles data...\n');

  try {
    // 1. Get all data from user_profiles table
    console.log('📊 Step 1: Getting all data from user_profiles table...');
    const { data: oldProfiles, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching old profiles:', fetchError);
      return;
    }

    console.log(`✅ Found ${oldProfiles.length} profiles to migrate`);

    if (oldProfiles.length === 0) {
      console.log('✅ No data to migrate');
      return;
    }

    // 2. Check what columns exist in both tables
    console.log('\n📋 Step 2: Checking target profiles table...');
    const { data: existingProfiles, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (existingError) {
      console.error('❌ Error accessing profiles table:', existingError);
      return;
    }

    console.log('✅ Profiles table is accessible');

    // 3. Migrate data record by record
    console.log('\n🔄 Step 3: Migrating profiles...');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < oldProfiles.length; i++) {
      const profile = oldProfiles[i];
      console.log(`\n   Processing profile ${i + 1}/${oldProfiles.length}: ${profile.id}`);
      
      try {
        // Check if profile already exists in new table
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', profile.id)
          .single();

        if (existing) {
          console.log(`   ⚠️  Profile already exists, skipping: ${profile.id}`);
          continue;
        }

        // Insert into profiles table
        const { data: insertedProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([profile])
          .select()
          .single();

        if (insertError) {
          console.error(`   ❌ Failed to insert profile ${profile.id}:`, insertError);
          errorCount++;
        } else {
          console.log(`   ✅ Migrated profile: ${profile.id} (${profile.organization_name || 'No org'})`);
          successCount++;
        }

      } catch (error) {
        console.error(`   ❌ Error processing profile ${profile.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Failed to migrate: ${errorCount}`);
    console.log(`   📋 Total processed: ${oldProfiles.length}`);

    // 4. Verify migration
    console.log('\n🔍 Step 4: Verifying migration...');
    const { data: newProfiles, error: verifyError, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    if (!verifyError) {
      console.log(`✅ Profiles table now has ${count} records`);
      
      if (newProfiles && newProfiles.length > 0) {
        console.log('🔍 Sample migrated data:');
        newProfiles.slice(0, 3).forEach(profile => {
          console.log(`   - ID: ${profile.id}`);
          console.log(`   - User ID: ${profile.user_id}`);
          console.log(`   - Organization: ${profile.organization_name || 'N/A'}`);
          console.log('   ---');
        });
      }
    }

    if (successCount === oldProfiles.length) {
      console.log('\n🎉 Migration completed successfully! Your company settings should now be restored.');
      console.log('💡 You can now log out and log back in to see your restored profile data.');
    } else {
      console.log('\n⚠️ Migration completed with some errors. Please check the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateProfilesToNewTable();