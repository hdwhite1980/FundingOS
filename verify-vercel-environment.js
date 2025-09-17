// verify-vercel-environment.js
// Script to verify Vercel environment variables for Supabase

console.log('🔍 VERCEL ENVIRONMENT VERIFICATION')
console.log('=' .repeat(50))

// Check current environment
console.log('Environment:', process.env.NODE_ENV || 'development')
console.log('Platform:', process.env.VERCEL ? 'Vercel' : 'Local')
console.log('')

// Check the exact variables the code is looking for
const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
}

console.log('📋 REQUIRED ENVIRONMENT VARIABLES:')
console.log('=' .repeat(50))

for (const [name, value] of Object.entries(requiredVars)) {
  const status = value ? '✅ SET' : '❌ MISSING'
  const preview = value ? (value.substring(0, 20) + '...') : 'Not set'
  const length = value ? value.length : 0
  
  console.log(`${name}:`)
  console.log(`  Status: ${status}`)
  console.log(`  Length: ${length} characters`)
  console.log(`  Preview: ${preview}`)
  console.log('')
}

// Check for placeholder values
console.log('🔍 CHECKING FOR PLACEHOLDER VALUES:')
console.log('=' .repeat(50))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (url) {
  const isUrlPlaceholder = url.includes('localhost') || 
                          url.includes('placeholder') || 
                          url === 'http://localhost:54321' ||
                          url === 'your-project-id.supabase.co'
  
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${isUrlPlaceholder ? '❌ PLACEHOLDER' : '✅ REAL VALUE'}`)
  if (isUrlPlaceholder) {
    console.log(`  Current value: ${url}`)
    console.log(`  ⚠️  This looks like a placeholder value!`)
  }
} else {
  console.log('NEXT_PUBLIC_SUPABASE_URL: ❌ MISSING')
}

if (anonKey) {
  const isKeyPlaceholder = anonKey === 'anon-key' || 
                          anonKey.includes('placeholder') ||
                          anonKey.length < 50 // Real Supabase anon keys are much longer
  
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${isKeyPlaceholder ? '❌ PLACEHOLDER' : '✅ REAL VALUE'}`)
  if (isKeyPlaceholder) {
    console.log(`  Current value: ${anonKey}`)
    console.log(`  ⚠️  This looks like a placeholder value!`)
  }
} else {
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY: ❌ MISSING')
}

console.log('')

// Provide specific fix instructions
console.log('🛠️  HOW TO FIX IN VERCEL:')
console.log('=' .repeat(50))
console.log('1. Go to https://vercel.com/dashboard')
console.log('2. Select your FundingOS project')
console.log('3. Go to Settings → Environment Variables')
console.log('4. Add these variables (if missing):')
console.log('')
console.log('   Variable Name: NEXT_PUBLIC_SUPABASE_URL')
console.log('   Value: https://your-project-id.supabase.co')
console.log('   Environment: Production, Preview, Development')
console.log('')
console.log('   Variable Name: NEXT_PUBLIC_SUPABASE_ANON_KEY')
console.log('   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your real anon key)')
console.log('   Environment: Production, Preview, Development')
console.log('')
console.log('   Variable Name: SUPABASE_SERVICE_ROLE_KEY')
console.log('   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your service role key)')
console.log('   Environment: Production, Preview, Development')
console.log('')

console.log('🔑 GET YOUR SUPABASE KEYS:')
console.log('=' .repeat(50))
console.log('1. Go to https://supabase.com/dashboard')
console.log('2. Select your project')
console.log('3. Go to Settings → API')
console.log('4. Copy:')
console.log('   - Project URL → NEXT_PUBLIC_SUPABASE_URL')
console.log('   - anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY')
console.log('   - service_role secret key → SUPABASE_SERVICE_ROLE_KEY')
console.log('')

console.log('⚠️  IMPORTANT NOTES:')
console.log('=' .repeat(50))
console.log('• NEXT_PUBLIC_ variables are exposed to the browser')
console.log('• Service role key should NEVER have NEXT_PUBLIC_ prefix')
console.log('• After updating Vercel env vars, redeploy your app')
console.log('• The error "supabaseKey is required" means NEXT_PUBLIC_SUPABASE_ANON_KEY is missing')
console.log('')

// Test Supabase connection if variables exist
if (url && anonKey && !url.includes('localhost') && anonKey !== 'anon-key') {
  console.log('🧪 TESTING CONNECTION:')
  console.log('=' .repeat(50))
  
  try {
    // Dynamic import to avoid issues if Supabase isn't configured
    import('@supabase/supabase-js').then(({ createClient }) => {
      const supabase = createClient(url, anonKey)
      
      // Test a simple query
      supabase
        .from('user_profiles')
        .select('count', { count: 'exact', head: true })
        .then(({ error }) => {
          if (error) {
            console.log('❌ Connection test failed:')
            console.log(`   ${error.message}`)
          } else {
            console.log('✅ Supabase connection successful!')
          }
        })
        .catch((err) => {
          console.log('❌ Connection test error:')
          console.log(`   ${err.message}`)
        })
    }).catch(() => {
      console.log('⚠️  Supabase client not available for testing')
    })
  } catch (error) {
    console.log('⚠️  Could not test connection:', error.message)
  }
} else {
  console.log('⚠️  Cannot test connection - missing or placeholder values detected')
}