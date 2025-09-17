// Test if the security migration worked by checking database tables
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSecurityTables() {
  console.log('🔍 CHECKING SECURITY MIGRATION STATUS...\n')
  
  try {
    // 1. Check if tables exist
    console.log('📋 1. CHECKING TABLE EXISTENCE:')
    
    const tables = ['user_profiles', 'user_sessions', 'user_devices', 'system_metrics']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        
        if (error) {
          console.log(`❌ ${table}: MISSING or ERROR - ${error.message}`)
        } else {
          console.log(`✅ ${table}: EXISTS`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ERROR - ${err.message}`)
      }
    }
    
    // 2. Check 2FA columns in user_profiles
    console.log('\n📋 2. CHECKING 2FA COLUMNS:')
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('two_factor_enabled, two_factor_secret, two_factor_secret_temp, two_factor_backup_codes')
        .limit(1)
      
      if (error) {
        console.log(`❌ 2FA columns: MISSING - ${error.message}`)
      } else {
        console.log(`✅ 2FA columns: ALL EXIST`)
      }
    } catch (err) {
      console.log(`❌ 2FA columns: ERROR - ${err.message}`)
    }
    
    // 3. Check device_fingerprint column in user_sessions
    console.log('\n📋 3. CHECKING SESSION COLUMNS:')
    
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('device_fingerprint, deactivated_at, deactivation_reason')
        .limit(1)
      
      if (error) {
        console.log(`❌ Session columns: MISSING - ${error.message}`)
      } else {
        console.log(`✅ Session columns: ALL EXIST`)
      }
    } catch (err) {
      console.log(`❌ Session columns: ERROR - ${err.message}`)
    }
    
    // 4. Check device management columns
    console.log('\n📋 4. CHECKING DEVICE COLUMNS:')
    
    try {
      const { data, error } = await supabase
        .from('user_devices')
        .select('device_fingerprint, user_agent, is_trusted, is_active')
        .limit(1)
      
      if (error) {
        console.log(`❌ Device columns: MISSING - ${error.message}`)
      } else {
        console.log(`✅ Device columns: ALL EXIST`)
      }
    } catch (err) {
      console.log(`❌ Device columns: ERROR - ${err.message}`)
    }
    
    // 5. Test API endpoints
    console.log('\n📋 5. TESTING API ENDPOINTS:')
    
    const endpoints = [
      '/api/auth/2fa/status',
      '/api/auth/sessions', 
      '/api/auth/devices'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
          headers: {
            'Authorization': `Bearer fake-token-for-test`
          }
        })
        
        if (response.status === 401) {
          console.log(`✅ ${endpoint}: ENDPOINT EXISTS (401 = auth required, which is correct)`)
        } else if (response.status === 200) {
          console.log(`✅ ${endpoint}: ENDPOINT WORKING`)
        } else {
          console.log(`⚠️  ${endpoint}: Status ${response.status}`)
        }
      } catch (err) {
        console.log(`❌ ${endpoint}: ERROR - ${err.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ MIGRATION CHECK FAILED:', error)
  }
}

console.log('🔒 SECURITY FEATURES MIGRATION STATUS CHECK')
console.log('============================================\n')

checkSecurityTables().then(() => {
  console.log('\n============================================')
  console.log('✅ MIGRATION STATUS CHECK COMPLETE')
})