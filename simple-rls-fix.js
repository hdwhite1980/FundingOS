const { createClient } = require('@supabase/supabase-js')

// Use production Supabase instance
const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTk5MjY0MSwiZXhwIjoyMDQxNTY4NjQxfQ.nFqzjZWN58rSIxD-s5P7YUKGvGh6oeGYZOEcRKo2Sv8'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function fixRLS() {
  try {
    console.log('🔧 Fixing project_opportunities RLS...')
    
    // Enable RLS
    await supabase.rpc('query', {
      query: 'ALTER TABLE project_opportunities ENABLE ROW LEVEL SECURITY'
    })
    console.log('✅ Enabled RLS on project_opportunities')
    
    // Drop existing policies
    await supabase.rpc('query', {
      query: 'DROP POLICY IF EXISTS "Users can view their own project opportunities" ON project_opportunities'
    })
    await supabase.rpc('query', {
      query: 'DROP POLICY IF EXISTS "Users can insert their own project opportunities" ON project_opportunities'
    })
    await supabase.rpc('query', {
      query: 'DROP POLICY IF EXISTS "Users can update their own project opportunities" ON project_opportunities'
    })
    await supabase.rpc('query', {
      query: 'DROP POLICY IF EXISTS "Users can delete their own project opportunities" ON project_opportunities'
    })
    console.log('✅ Dropped existing policies')
    
    // Create new policies
    await supabase.rpc('query', {
      query: `CREATE POLICY "Users can view their own project opportunities" ON project_opportunities
              FOR SELECT USING (auth.uid() = user_id)`
    })
    await supabase.rpc('query', {
      query: `CREATE POLICY "Users can insert their own project opportunities" ON project_opportunities
              FOR INSERT WITH CHECK (auth.uid() = user_id)`
    })
    await supabase.rpc('query', {
      query: `CREATE POLICY "Users can update their own project opportunities" ON project_opportunities
              FOR UPDATE USING (auth.uid() = user_id)`
    })
    await supabase.rpc('query', {
      query: `CREATE POLICY "Users can delete their own project opportunities" ON project_opportunities
              FOR DELETE USING (auth.uid() = user_id)`
    })
    console.log('✅ Created new RLS policies')
    
    console.log('🎉 RLS fix complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixRLS()