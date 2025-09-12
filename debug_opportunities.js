// Debug script to check what's in the opportunities table
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugOpportunities() {
  console.log('🔍 Debugging opportunities table...\n')
  
  // 1. Check total count
  console.log('1️⃣ TOTAL OPPORTUNITIES:')
  const { count, error: countError } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    console.error('Error counting opportunities:', countError)
    return
  }
  
  console.log(`   Total opportunities in database: ${count}`)
  
  // 2. Check by source
  console.log('\n2️⃣ OPPORTUNITIES BY SOURCE:')
  const { data: sources, error: sourceError } = await supabase
    .from('opportunities')
    .select('source')
    .order('source')
  
  if (sourceError) {
    console.error('Error getting sources:', sourceError)
    return
  }
  
  const sourceCounts = sources.reduce((acc, row) => {
    acc[row.source || 'null'] = (acc[row.source || 'null'] || 0) + 1
    return acc
  }, {})
  
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`   ${source}: ${count} opportunities`)
  })
  
  // 3. Check SAM.gov specifically
  console.log('\n3️⃣ SAM.GOV OPPORTUNITIES:')
  const { data: samOpps, error: samError } = await supabase
    .from('opportunities')
    .select('id, title, sponsor, created_at, amount_min, amount_max')
    .eq('source', 'sam_gov')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (samError) {
    console.error('Error getting SAM.gov opportunities:', samError)
    return
  }
  
  if (samOpps.length === 0) {
    console.log('   ❌ No SAM.gov opportunities found!')
  } else {
    console.log(`   ✅ Found ${samOpps.length} recent SAM.gov opportunities:`)
    samOpps.forEach(opp => {
      const amount = opp.amount_max ? `$${opp.amount_max.toLocaleString()}` : 'N/A'
      console.log(`   • ${opp.title.substring(0, 60)}... (${amount})`)
    })
  }
  
  // 4. Check recent additions
  console.log('\n4️⃣ RECENT OPPORTUNITIES (Last 7 days):')
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const { data: recent, error: recentError } = await supabase
    .from('opportunities')
    .select('source, created_at')
    .gte('created_at', weekAgo.toISOString())
    .order('created_at', { ascending: false })
  
  if (recentError) {
    console.error('Error getting recent opportunities:', recentError)
    return
  }
  
  if (recent.length === 0) {
    console.log('   ❌ No opportunities added in the last 7 days')
  } else {
    const recentCounts = recent.reduce((acc, row) => {
      acc[row.source || 'null'] = (acc[row.source || 'null'] || 0) + 1
      return acc
    }, {})
    
    console.log(`   📅 ${recent.length} opportunities added in last 7 days:`)
    Object.entries(recentCounts).forEach(([source, count]) => {
      console.log(`   • ${source}: ${count} opportunities`)
    })
  }
  
  // 5. Check SAM.gov usage table
  console.log('\n5️⃣ SAM.GOV USAGE TRACKING:')
  const { data: usage, error: usageError } = await supabase
    .from('sam_gov_usage')
    .select('*')
    .order('date', { ascending: false })
    .limit(7)
  
  if (usageError) {
    console.error('Error getting SAM.gov usage:', usageError)
  } else if (usage.length === 0) {
    console.log('   ❌ No SAM.gov usage records found')
  } else {
    console.log('   📊 Recent SAM.gov API usage:')
    usage.forEach(row => {
      console.log(`   • ${row.date}: ${row.request_count} requests`)
    })
  }
}

debugOpportunities().catch(console.error)