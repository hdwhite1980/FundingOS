// Vercel Environment Variables Troubleshoot Guide

console.log('🔍 VERCEL ENVIRONMENT VARIABLES TROUBLESHOOT');
console.log('=============================================\n');

console.log('✅ You confirmed variables are configured in Vercel');
console.log('❌ But our test shows they are NOT available at runtime\n');

console.log('🎯 MOST COMMON ISSUES & SOLUTIONS:\n');

console.log('1. 📍 VARIABLE SCOPE ISSUE');
console.log('   Problem: Variables set for "Production" only but running in "Preview"');
console.log('   Solution: In Vercel dashboard:');
console.log('   • Go to Settings > Environment Variables');
console.log('   • Ensure variables are checked for ALL environments:');
console.log('     ☑️ Production');
console.log('     ☑️ Preview'); 
console.log('     ☑️ Development');
console.log('');

console.log('2. 🔄 DEPLOYMENT TIMING ISSUE');
console.log('   Problem: Variables added AFTER last deployment');
console.log('   Solution:');
console.log('   • Trigger a new deployment after adding variables');
console.log('   • Go to Vercel > Deployments > Redeploy');
console.log('   • Or push a new commit to trigger rebuild');
console.log('');

console.log('3. 📝 VARIABLE NAME TYPOS');
console.log('   Problem: Slight misspelling in variable names');
console.log('   Required names (case-sensitive):');
console.log('   • NEXT_PUBLIC_SUPABASE_URL');
console.log('   • NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('   • SUPABASE_SERVICE_ROLE_KEY');
console.log('');

console.log('4. 🔒 BUILD CACHE ISSUE');
console.log('   Problem: Vercel using cached build without new variables');
console.log('   Solution:');
console.log('   • In Vercel dashboard, go to Settings > General');
console.log('   • Scroll down to "Build & Development Settings"');
console.log('   • Click "Clear Build Cache" or redeploy with cache bypass');
console.log('');

console.log('5. 🎭 ENVIRONMENT MISMATCH');
console.log('   Problem: Variables set for wrong branch/environment');
console.log('   Check:');
console.log('   • Which branch is your production deployment?');
console.log('   • Are you testing the right deployment URL?');
console.log('   • Production vs Preview environment settings');
console.log('');

console.log('📋 IMMEDIATE VERIFICATION STEPS:');
console.log('');
console.log('Step 1: Check Vercel Dashboard');
console.log('• Go to your FundingOS project in Vercel');
console.log('• Settings > Environment Variables');
console.log('• Verify these exist with ✅ for all environments:');
console.log('  - NEXT_PUBLIC_SUPABASE_URL');
console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY'); 
console.log('  - SUPABASE_SERVICE_ROLE_KEY');
console.log('');

console.log('Step 2: Get Values from Supabase');
console.log('• Go to https://supabase.com/dashboard');
console.log('• Select your FundingOS project');
console.log('• Settings > API');
console.log('• Copy exact values:');
console.log('  - Project URL → NEXT_PUBLIC_SUPABASE_URL');
console.log('  - anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('  - service_role → SUPABASE_SERVICE_ROLE_KEY');
console.log('');

console.log('Step 3: Force Redeploy');
console.log('• In Vercel: Deployments > Three dots > Redeploy');
console.log('• Or push a dummy commit to trigger new build');
console.log('');

console.log('🚨 DEBUG: What to check in Vercel logs');
console.log('• Go to Vercel > Functions > View Function Logs');
console.log('• Look for build logs and see if env vars are loaded');
console.log('• Check for any build-time errors related to Supabase');
console.log('');

console.log('🔬 ALTERNATIVE: Test in a Vercel Function');
console.log('Create a test API route to verify variables are available:');
console.log('File: pages/api/test-env.js');
console.log('');
console.log('export default function handler(req, res) {');
console.log('  res.json({');
console.log('    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,');
console.log('    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,');
console.log('    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,');
console.log('    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + "...",');
console.log('    nodeEnv: process.env.NODE_ENV');
console.log('  });');
console.log('}');
console.log('');

console.log('💡 NEXT STEPS:');
console.log('1. Double-check variable names and values in Vercel');
console.log('2. Ensure all environments are selected');
console.log('3. Redeploy after confirming variables');
console.log('4. Test the /api/test-env endpoint');
console.log('5. If still failing, check Vercel build logs for clues');
console.log('');
console.log('Once env vars work → run the database migration script!');