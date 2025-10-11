require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testExpandedCategories() {
  console.log('=== Testing Expanded Resource Categories ===\n');

  // All resource categories now included in the search
  const resourceCategories = [
    'resources', 
    'non_monetary', 
    'in_kind', 
    'software_grant', 
    'cloud_credits', 
    'data_credits',
    'ad_credits',
    'mentorship',
    'training',
    'facility_access',
    'equipment',
    'services',
    'incubator',
    'accelerator'
  ];

  console.log('🔍 Searching with expanded categories:', resourceCategories.join(', '), '\n');

  // Query using overlaps just like the actual app
  let query = supabase
    .from('opportunities')
    .select('*')
    .overlaps('ai_categories', resourceCategories)
    .is('amount_min', null)
    .is('amount_max', null)
    .eq('ai_analysis->>isNonMonetaryResource', 'true');

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('❌ Query error:', error);
    return;
  }

  console.log(`✅ Found ${data.length} resource opportunities\n`);

  // Group by sponsor
  const bySponsor = {};
  data.forEach(opp => {
    const sponsor = opp.sponsor || 'Unknown';
    if (!bySponsor[sponsor]) bySponsor[sponsor] = [];
    bySponsor[sponsor].push(opp);
  });

  console.log('=== Resources by Sponsor ===\n');
  Object.keys(bySponsor).sort().forEach(sponsor => {
    console.log(`\n📦 ${sponsor} (${bySponsor[sponsor].length} opportunities)`);
    bySponsor[sponsor].forEach((opp, idx) => {
      console.log(`   ${idx + 1}. ${opp.title}`);
      console.log(`      Categories: ${JSON.stringify(opp.ai_categories)}`);
      console.log(`      Resource Types: ${JSON.stringify(opp.ai_analysis?.resourceTypes || [])}`);
    });
  });

  // Check specifically for Google grants
  const googleGrants = data.filter(opp => 
    (opp.sponsor || '').toLowerCase().includes('google')
  );

  console.log(`\n\n=== Google Grants Specifically ===`);
  console.log(`Found ${googleGrants.length} Google grants\n`);
  
  googleGrants.forEach((grant, idx) => {
    console.log(`${idx + 1}. ${grant.title}`);
    console.log(`   Categories matched: ${grant.ai_categories.filter(cat => 
      resourceCategories.includes(cat)
    ).join(', ')}`);
  });

  // Verify coverage
  console.log(`\n\n=== Category Coverage Analysis ===\n`);
  const categoriesFound = new Set();
  data.forEach(opp => {
    (opp.ai_categories || []).forEach(cat => {
      if (resourceCategories.includes(cat)) {
        categoriesFound.add(cat);
      }
    });
  });

  console.log('Categories with matches:');
  Array.from(categoriesFound).sort().forEach(cat => {
    const count = data.filter(opp => 
      (opp.ai_categories || []).includes(cat)
    ).length;
    console.log(`  ✓ ${cat}: ${count} opportunities`);
  });

  console.log('\nCategories with no matches:');
  resourceCategories.forEach(cat => {
    if (!categoriesFound.has(cat)) {
      console.log(`  - ${cat}`);
    }
  });
}

testExpandedCategories().catch(console.error);
