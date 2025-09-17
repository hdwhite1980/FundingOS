// Complete Project Creation Debug - run this locally to test database
// This will identify exactly what database fields are missing or incorrect

const { createClient } = require('@supabase/supabase-js')

// Test with your actual environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY'

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('YOUR_')) {
  console.error('❌ Please set your Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testProjectCreation() {
  console.log('🔍 COMPREHENSIVE PROJECT CREATION DEBUG')
  console.log('==========================================')

  // First, test if we can access the projects table at all
  console.log('\n1️⃣ Testing basic table access...')
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Cannot access projects table:', error.message)
      return
    }
    console.log('✅ Projects table is accessible')
  } catch (err) {
    console.error('❌ Database connection error:', err.message)
    return
  }

  // Test minimal project creation
  console.log('\n2️⃣ Testing minimal project creation...')
  const minimalProject = {
    name: 'TEST_PROJECT_DELETE_ME',
    description: 'Test project for schema validation',
    user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([minimalProject])
      .select()

    if (error) {
      console.error('❌ Minimal project creation failed:')
      console.error('Message:', error.message)
      console.error('Details:', error.details)
      console.error('Hint:', error.hint)
      console.error('Code:', error.code)
      
      // Try to identify the specific field that's causing issues
      if (error.message.includes('null value in column')) {
        const match = error.message.match(/null value in column "([^"]+)"/)
        if (match) {
          console.error(`🎯 ISSUE: Required field "${match[1]}" is missing NOT NULL constraint`)
        }
      }
    } else {
      console.log('✅ Minimal project created successfully:', data[0]?.id)
      
      // Clean up
      await supabase
        .from('projects')
        .delete()
        .eq('id', data[0].id)
      
      console.log('✅ Test project cleaned up')
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }

  // Test full project creation with all expected fields
  console.log('\n3️⃣ Testing full project creation...')
  const fullProject = {
    name: 'FULL_TEST_PROJECT_DELETE_ME',
    description: 'Full test project for schema validation',
    user_id: '00000000-0000-0000-0000-000000000000',
    project_type: 'technology',
    location: 'Test Location',
    total_project_budget: 50000,
    funding_request_amount: 25000,
    cash_match_available: 5000,
    in_kind_match_available: 10000,
    estimated_people_served: 100,
    project_categories: ['technology', 'research'],
    primary_goals: ['innovation', 'development'],
    preferred_funding_types: ['grants', 'contracts'],
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([fullProject])
      .select()

    if (error) {
      console.error('❌ Full project creation failed:')
      console.error('Message:', error.message)
      console.error('Details:', error.details)
      console.error('Hint:', error.hint)
      console.error('Code:', error.code)
      
      // Identify problematic fields
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        const match = error.message.match(/column "([^"]+)" of relation "projects" does not exist/)
        if (match) {
          console.error(`🎯 ISSUE: Column "${match[1]}" does not exist in projects table`)
        }
      }
      
      if (error.message.includes('invalid input syntax')) {
        console.error('🎯 ISSUE: Data type mismatch - check array/JSON fields')
      }
    } else {
      console.log('✅ Full project created successfully:', data[0]?.id)
      
      // Clean up
      await supabase
        .from('projects')
        .delete()
        .eq('id', data[0].id)
      
      console.log('✅ Test project cleaned up')
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }

  // Get actual table schema
  console.log('\n4️⃣ Getting actual table schema...')
  try {
    const { data, error } = await supabase
      .rpc('get_table_columns', { table_name: 'projects' })

    if (error) {
      console.log('RPC not available, trying information_schema...')
      
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'projects')
        .eq('table_schema', 'public')
        .order('ordinal_position')

      if (schemaError) {
        console.error('❌ Cannot get schema information:', schemaError.message)
      } else {
        console.log('✅ Projects table schema:')
        schemaData.forEach(col => {
          console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
        })
      }
    } else {
      console.log('✅ Projects table columns:', data)
    }
  } catch (err) {
    console.error('❌ Schema query error:', err.message)
  }

  console.log('\n🎯 NEXT STEPS:')
  console.log('1. Check the specific error messages above')
  console.log('2. Compare expected fields vs actual table schema')
  console.log('3. Run database migration if columns are missing')
  console.log('4. Check data types for array fields (should be JSONB/JSON)')
}

if (require.main === module) {
  testProjectCreation().catch(console.error)
}

module.exports = { testProjectCreation }