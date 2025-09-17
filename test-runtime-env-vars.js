// Environment Variable Runtime Test
// This will help us see what's actually available to the frontend

console.log('🔍 RUNTIME ENVIRONMENT VARIABLE CHECK');
console.log('=====================================\n');

console.log('📊 Current Runtime Status:');
console.log('typeof window:', typeof window);
console.log('typeof process:', typeof process);
console.log('NODE_ENV:', typeof process !== 'undefined' ? process.env?.NODE_ENV || 'undefined' : 'no process object');

console.log('\n🎯 Critical Frontend Variables:');
const frontendVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

frontendVars.forEach(varName => {
  const value = typeof process !== 'undefined' ? process.env?.[varName] : undefined;
  console.log(`${varName}: ${value ? `${value.substring(0, 20)}...` : 'NOT AVAILABLE'}`);
});

console.log('\n🔧 Backend Variables (should work in API routes):');
const backendVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'NEXTAUTH_SECRET'
];

backendVars.forEach(varName => {
  const value = typeof process !== 'undefined' ? process.env?.[varName] : undefined;
  console.log(`${varName}: ${value ? 'SET' : 'NOT SET'}`);
});

console.log('\n💡 Diagnosis:');
if (typeof window !== 'undefined') {
  console.log('✅ Running in browser context');
  console.log('❌ Browser should have access to NEXT_PUBLIC_* vars if build was correct');
} else {
  console.log('✅ Running in Node.js context');
  console.log('✅ Server-side should have access to all environment variables');
}

console.log('\n🚀 Next Steps:');
console.log('1. If NEXT_PUBLIC vars are missing in browser: rebuild/redeploy');
console.log('2. If they show up here but still get Supabase error: check build process');
console.log('3. Environment variables must be available at BUILD TIME for client bundle');

// Try to initialize Supabase to see exact error
console.log('\n🔬 Supabase Initialization Test:');
try {
  // Dynamic import to avoid issues if modules aren't available
  if (typeof process !== 'undefined' && process.env) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log(`Supabase URL available: ${!!url}`);
    console.log(`Supabase Key available: ${!!key}`);
    
    if (!url) console.log('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
    if (!key) console.log('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
    
    if (url && key) {
      console.log('✅ Both URL and key are available');
      console.log('URL format check:', url.startsWith('http') ? '✅ valid' : '❌ invalid');
      console.log('Key format check:', key.length > 20 ? '✅ looks valid' : '❌ too short/invalid');
    }
  } else {
    console.log('❌ process.env is not available');
  }
} catch (error) {
  console.log('❌ Error during Supabase test:', error.message);
}