require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAllResources() {
  console.log('=== Checking All Resource Opportunities ===\n');

  // Get all opportunities with resource indicators
  const { data: allOpps, error } = await supabase
    .from('opportunities')
    .select('id, title, sponsor, source, ai_analysis, ai_categories, amount_min, amount_max, project_types')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching opportunities:', error);
    return;
  }

  console.log(`Total opportunities in database: ${allOpps.length}\n`);

  // Filter for resources
  const resources = allOpps.filter(opp => {
    const isNonMonetary = opp.ai_analysis?.isNonMonetaryResource === true;
    const hasResourceCategory = opp.ai_categories?.some(cat => 
      ['resources', 'non_monetary', 'ad_credits', 'cloud_credits', 'software', 'mentorship', 'training'].includes(cat.toLowerCase())
    );
    const noAmounts = !opp.amount_min && !opp.amount_max;
    
    return (isNonMonetary || hasResourceCategory) && noAmounts;
  });

  console.log(`\n=== Found ${resources.length} Resource Opportunities ===\n`);

  resources.forEach((opp, idx) => {
    console.log(`\n${idx + 1}. ${opp.title}`);
    console.log(`   Sponsor: ${opp.sponsor || 'N/A'}`);
    console.log(`   Source: ${opp.source || 'N/A'}`);
    console.log(`   Project Types: ${JSON.stringify(opp.project_types)}`);
    console.log(`   AI Categories: ${JSON.stringify(opp.ai_categories)}`);
    console.log(`   isNonMonetaryResource: ${opp.ai_analysis?.isNonMonetaryResource}`);
    console.log(`   Resource Types: ${JSON.stringify(opp.ai_analysis?.resourceTypes)}`);
  });

  // Now test the actual resourceOnly query from the app
  console.log('\n\n=== Testing Actual ResourceOnly Query ===\n');

  const resourceCategories = [
    'resources',
    'non_monetary',
    'software',
    'cloud_credits',
    'ad_credits',
    'mentorship',
    'training',
    'incubator',
    'accelerator'
  ];

  let query = supabase
    .from('opportunities')
    .select('*')
    .overlaps('ai_categories', resourceCategories)
    .is('amount_min', null)
    .is('amount_max', null);

  // Add AI analysis check
  query = query.eq('ai_analysis->>isNonMonetaryResource', 'true');

  const { data: queryResults, error: queryError } = await query
    .order('posted_date', { ascending: false })
    .limit(200);

  if (queryError) {
    console.error('Query error:', queryError);
  } else {
    console.log(`Query returned: ${queryResults.length} opportunities`);
    queryResults.forEach((opp, idx) => {
      console.log(`\n${idx + 1}. ${opp.title}`);
      console.log(`   Categories: ${JSON.stringify(opp.ai_categories)}`);
    });
  }
}

checkAllResources().catch(console.error);
