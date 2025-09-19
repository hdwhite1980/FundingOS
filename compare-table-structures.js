// Check and compare table structures for migration
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pcusbqltbvgebzcacvif.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
);

async function compareTableStructures() {
  console.log('🔍 Comparing table structures...\n');

  try {
    // 1. Get a sample record from user_profiles to see its structure
    console.log('📊 Step 1: Analyzing user_profiles table structure...');
    const { data: oldProfile, error: oldError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
      .single();

    if (oldError) {
      console.error('❌ Error fetching old profile:', oldError);
      return;
    }

    console.log('✅ user_profiles columns:');
    Object.keys(oldProfile).forEach(key => {
      console.log(`   - ${key}: ${typeof oldProfile[key]} = ${oldProfile[key]?.toString()?.substring(0, 50) || 'null'}`);
    });

    // 2. Try to get structure of profiles table by attempting insert with minimal data
    console.log('\n📊 Step 2: Testing profiles table structure...');
    
    // Create a minimal test profile to see what's required
    const testProfile = {
      id: oldProfile.id,
      user_id: oldProfile.user_id,
      organization_name: oldProfile.organization_name,
      created_at: oldProfile.created_at || new Date().toISOString(),
      updated_at: oldProfile.updated_at || new Date().toISOString()
    };

    console.log('🧪 Testing minimal profile insertion...');
    const { data: insertTest, error: insertError } = await supabase
      .from('profiles')
      .insert([testProfile])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Minimal insert failed:', insertError);
      
      // Try with even fewer fields
      const minimalProfile = {
        id: oldProfile.id,
        user_id: oldProfile.user_id
      };
      
      console.log('🧪 Testing ultra-minimal profile insertion...');
      const { data: ultraTest, error: ultraError } = await supabase
        .from('profiles')
        .insert([minimalProfile])
        .select()
        .single();

      if (ultraError) {
        console.error('❌ Ultra-minimal insert failed:', ultraError);
      } else {
        console.log('✅ Ultra-minimal insert succeeded:', ultraTest);
        
        // Clean up test record
        await supabase.from('profiles').delete().eq('id', ultraTest.id);
      }
    } else {
      console.log('✅ Minimal insert succeeded:', insertTest);
      
      // Clean up test record
      await supabase.from('profiles').delete().eq('id', insertTest.id);
    }

    // 3. Get all profiles from user_profiles and show their basic info
    console.log('\n📋 Step 3: All profiles that need migration...');
    const { data: allOldProfiles, error: allError } = await supabase
      .from('user_profiles')
      .select('id, user_id, organization_name, email, created_at');

    if (!allError && allOldProfiles) {
      console.log(`Found ${allOldProfiles.length} profiles to migrate:`);
      allOldProfiles.forEach(profile => {
        console.log(`   - ${profile.id}: ${profile.organization_name || 'No org'} (${profile.email || 'No email'})`);
      });
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

compareTableStructures();