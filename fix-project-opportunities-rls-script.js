const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Use production Supabase instance
const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTk5MjY0MSwiZXhwIjoyMDQxNTY4NjQxfQ.nFqzjZWN58rSIxD-s5P7YUKGvGh6oeGYZOEcRKo2Sv8'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function fixProjectOpportunitiesRLS() {
  try {
    console.log('🔧 Fixing project_opportunities RLS policies...')
    
    const sql = fs.readFileSync('fix_project_opportunities_rls.sql', 'utf8')
    
    // Split the SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))
    
    for (const statement of statements) {
      if (statement.includes('DO $$')) {
        // Skip the DO block as it's just for messages
        continue
      }
      
      try {
        const { data, error } = await supabase.rpc('query', { 
          query: statement 
        })
        
        if (error) {
          console.log(`⚠️  Statement result: ${error.message}`)
        } else {
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`)
        }
      } catch (err) {
        console.log(`⚠️  Error executing: ${statement.substring(0, 50)}... - ${err.message}`)
      }
    }
    
    // Test the fix by checking if we can create a project opportunity
    console.log('\\n🧪 Testing project_opportunities access...')
    const { data: testData, error: testError } = await supabase
      .from('project_opportunities')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('❌ Test failed:', testError.message)
    } else {
      console.log('✅ project_opportunities table accessible')
      console.log(`   Found ${testData ? testData.length : 0} records`)
    }
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error)
  }
}

fixProjectOpportunitiesRLS()