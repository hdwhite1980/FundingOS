const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCurrentSchema() {
  console.log('🔍 Checking current database schema...\n');
  
  try {
    // Check if tables exist using a simple query
    console.log('=== TABLE EXISTENCE CHECK ===');
    
    // Check user_sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .limit(1);
    
    if (sessionsError) {
      if (sessionsError.message.includes('does not exist')) {
        console.log('❌ user_sessions table: DOES NOT EXIST');
      } else {
        console.log('❓ user_sessions table: EXISTS but error:', sessionsError.message);
      }
    } else {
      console.log('✅ user_sessions table: EXISTS');
    }
    
    // Check user_devices
    const { data: devicesData, error: devicesError } = await supabase
      .from('user_devices')
      .select('*')
      .limit(1);
    
    if (devicesError) {
      if (devicesError.message.includes('does not exist')) {
        console.log('❌ user_devices table: DOES NOT EXIST');
      } else {
        console.log('❓ user_devices table: EXISTS but error:', devicesError.message);
      }
    } else {
      console.log('✅ user_devices table: EXISTS');
    }
    
    // Check user_profiles for 2FA columns
    console.log('\n=== USER_PROFILES 2FA COLUMNS CHECK ===');
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, two_factor_enabled, two_factor_secret, two_factor_backup_codes')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ 2FA columns missing:', profilesError.message);
      
      // Check if basic user_profiles exists
      const { data: basicProfile, error: basicError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
        
      if (basicError) {
        console.log('❌ user_profiles table: DOES NOT EXIST');
      } else {
        console.log('✅ user_profiles table: EXISTS (but missing 2FA columns)');
      }
    } else {
      console.log('✅ user_profiles 2FA columns: EXISTS');
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('Based on the checks above, we need to run the schema migration.');
    console.log('The error suggests user_sessions table was created but is referencing');
    console.log('a device_fingerprint column that should be in the same table.');
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

checkCurrentSchema();