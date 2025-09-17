const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseConnection() {
  console.log('🔗 Testing Supabase connection and schema...\n');
  
  // Check environment variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  console.log('=== ENVIRONMENT VARIABLES ===');
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`❌ ${varName}: MISSING`);
      return;
    }
  }
  
  try {
    // Test with service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('\n=== DATABASE CONNECTION TEST ===');
    
    // Simple connection test
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log(`❌ Connection test failed: ${testError.message}`);
      return;
    } else {
      console.log('✅ Database connection successful');
    }
    
    console.log('\n=== SCHEMA STATUS CHECK ===');
    
    // Check if user_sessions table exists
    const { data: sessionsTest, error: sessionsError } = await supabase
      .rpc('get_table_info', { table_name: 'user_sessions' })
      .single();
    
    if (sessionsError && sessionsError.message.includes('does not exist')) {
      // Create the function first
      const createFunction = `
        CREATE OR REPLACE FUNCTION get_table_info(table_name text)
        RETURNS json AS $$
        BEGIN
          RETURN (
            SELECT json_build_object(
              'exists', EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = $1 AND table_schema = 'public'
              ),
              'columns', (
                SELECT json_agg(column_name)
                FROM information_schema.columns 
                WHERE table_name = $1 AND table_schema = 'public'
              )
            )
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;
      
      await supabase.rpc('exec_sql', { sql: createFunction });
      console.log('📝 Created helper function for schema checking');
    }
    
    // Manual check for device_fingerprint column
    console.log('🔍 Checking for the missing device_fingerprint column...');
    
    // Try to select device_fingerprint - this will fail if column doesn't exist
    const { error: columnError } = await supabase
      .from('user_sessions')
      .select('device_fingerprint')
      .limit(1);
    
    if (columnError) {
      if (columnError.message.includes('device_fingerprint') && columnError.message.includes('does not exist')) {
        console.log('❌ CONFIRMED: device_fingerprint column is missing from user_sessions table');
        console.log('');
        console.log('🛠️  SOLUTION: You need to run the SQL migration script!');
        console.log('');
        console.log('📋 NEXT STEPS:');
        console.log('1. Go to your Supabase Dashboard');
        console.log('2. Open SQL Editor');
        console.log('3. Copy/paste the contents of fix-device-fingerprint-error.sql');
        console.log('4. Click "Run" to execute the migration');
        console.log('');
        console.log('The migration will add the missing column and complete your schema.');
      } else {
        console.log(`❓ Unexpected error: ${columnError.message}`);
      }
    } else {
      console.log('✅ device_fingerprint column exists - schema looks good!');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

testDatabaseConnection();