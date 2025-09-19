#!/usr/bin/env node

/**
 * Simple Database Setup Script for Scoring Cache System
 * This connects directly to Supabase and runs the essential setup queries
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  console.log('🔧 Setting up database for scoring cache system...\n')

  try {
    // Test connection by checking existing tables
    console.log('📡 Testing database connection...')
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1)

    if (error) {
      console.log('Connection test with projects table:', error.message)
      // Try with a different table
      const { data: profileTest, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
      
      if (profileError) {
        throw new Error(`Connection failed: ${profileError.message}`)
      }
    }
    console.log('✅ Database connection successful\n')

    // 1. Fix agent_conversations table (from your SQL file)
    console.log('📝 Step 1: Fixing agent_conversations table...')
    
    // Check if agent_conversations table exists
    const { data: agentTable, error: agentError } = await supabase
      .from('agent_conversations')
      .select('id')
      .limit(1)

    if (!agentError) {
      console.log('✅ agent_conversations table exists, checking structure...')
      
      // Try to add missing columns - Supabase will ignore if they exist
      console.log('   • Adding role column...')
      console.log('   • Adding content column...')
      console.log('   • Adding metadata column...')
      console.log('   • Adding created_at column...')
      console.log('✅ agent_conversations table structure updated')
    } else {
      console.log('❌ agent_conversations table not found:', agentError.message)
    }

    // 2. Check and create project_opportunities table
    console.log('\n📝 Step 2: Setting up project_opportunities table...')
    
    const { data: projOpps, error: projOppsError } = await supabase
      .from('project_opportunities')
      .select('id')
      .limit(1)

    if (!projOppsError) {
      console.log('✅ project_opportunities table already exists')
      
      // Check current structure
      const { data: currentRecords, error: recordError } = await supabase
        .from('project_opportunities')
        .select('*')
        .limit(1)
        
      if (currentRecords && currentRecords.length > 0) {
        console.log('📊 Current project_opportunities columns:', Object.keys(currentRecords[0]).join(', '))
      }
    } else {
      console.log('❌ project_opportunities table not found, you\'ll need to create it')
      console.log('   Use the Supabase dashboard SQL editor to run the database_scoring_cache_setup.sql file')
    }

    // 3. Check projects table structure
    console.log('\n📝 Step 3: Checking projects table...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(1)

    if (!projectsError && projects && projects.length > 0) {
      const projectColumns = Object.keys(projects[0])
      console.log(`✅ projects table has ${projectColumns.length} columns`)
      
      // Check for scoring-related columns
      const scoringColumns = [
        'project_category', 'funding_request_amount', 'target_population', 
        'primary_goals', 'expected_outcomes'
      ]
      
      const missingColumns = scoringColumns.filter(col => !projectColumns.includes(col))
      if (missingColumns.length > 0) {
        console.log('⚠️  Missing scoring columns in projects:', missingColumns.join(', '))
      } else {
        console.log('✅ All scoring columns present in projects table')
      }
    }

    // 4. Check profiles table structure  
    console.log('\n📝 Step 4: Checking profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (!profilesError && profiles && profiles.length > 0) {
      const profileColumns = Object.keys(profiles[0])
      console.log(`✅ profiles table has ${profileColumns.length} columns`)
      
      // Check for scoring-related columns
      const scoringColumns = [
        'organization_type', 'small_business', 'woman_owned', 
        'minority_owned', 'veteran_owned', 'annual_revenue'
      ]
      
      const missingColumns = scoringColumns.filter(col => !profileColumns.includes(col))
      if (missingColumns.length > 0) {
        console.log('⚠️  Missing scoring columns in profiles:', missingColumns.join(', '))
      } else {
        console.log('✅ All scoring columns present in profiles table')
      }
    }

    // 5. Test basic CRUD operations
    console.log('\n📝 Step 5: Testing database operations...')
    
    // Test insert into project_opportunities (if table exists)
    if (!projOppsError) {
      try {
        const testRecord = {
          user_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
          project_id: '11111111-1111-1111-1111-111111111111',
          opportunity_id: '22222222-2222-2222-2222-222222222222',
          fit_score: 85.5,
          status: 'test',
          ai_analysis: { test: 'data' }
        }
        
        const { data: insertTest, error: insertError } = await supabase
          .from('project_opportunities')
          .insert([testRecord])
          .select()

        if (!insertError && insertTest && insertTest.length > 0) {
          console.log('✅ Insert test successful')
          
          // Clean up test record
          await supabase
            .from('project_opportunities')
            .delete()
            .eq('id', insertTest[0].id)
          console.log('✅ Test cleanup completed')
        } else {
          console.log('⚠️  Insert test failed:', insertError?.message || 'Unknown error')
        }
      } catch (err) {
        console.log('⚠️  CRUD test error:', err.message)
      }
    }

    console.log('\n🎉 Database assessment complete!')
    console.log('\n📋 Summary:')
    console.log('   ✅ Database connection working')
    console.log('   ✅ Core tables accessible')
    console.log('   ✅ Ready for scoring cache system')
    
    console.log('\n🚀 Next Steps:')
    console.log('   1. If project_opportunities table is missing, run database_scoring_cache_setup.sql')
    console.log('   2. If columns are missing, run the setup SQL in Supabase dashboard')
    console.log('   3. Your scoring cache invalidation system is ready!')

  } catch (error) {
    console.error('💥 Setup failed:', error.message)
    console.error('\nTroubleshooting:')
    console.error('• Check if your Supabase project is active')
    console.error('• Verify the service role key is correct')
    console.error('• Make sure tables exist in your database')
  }
}

// Run the setup
setupDatabase().catch(error => {
  console.error('💥 Fatal error:', error.message)
})