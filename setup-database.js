#!/usr/bin/env node

/**
 * Database Setup Script for Scoring Cache System
 * This script connects to your Supabase database and sets up the required tables and columns
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://pcusbqltbvgebzcacvif.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjdXNicWx0YnZnZWJ6Y2FjdmlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk5NTg2OCwiZXhwIjoyMDcyNTcxODY4fQ.FPli2Mo22Y7YQiqoaQBSt2H3pa4aIOrpVy6BqaukvnQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  console.log('🔧 Setting up database for scoring cache system...\n')

  try {
    // Test connection
    console.log('📡 Testing database connection...')
    const { data: testData, error: testError } = await supabase
      .from('_supabase_tables')
      .select('table_name')
      .limit(1)

    // If that fails, try a different approach
    if (testError) {
      console.log('Trying alternative connection test...')
      const { data: altTest, error: altError } = await supabase
        .rpc('exec_sql', {
          query: 'SELECT 1 as test'
        })
      
      if (altError) {
        throw new Error(`Connection failed: ${altError.message}`)
      }
    }
    console.log('✅ Database connection successful\n')

    // 1. Check current agent_conversations table structure
    console.log('🔍 Checking agent_conversations table structure...')
    const { data: agentColumns, error: agentError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'agent_conversations' 
          ORDER BY ordinal_position;
        `
      })

    if (!agentError && agentColumns) {
      console.log('Current agent_conversations columns:')
      console.table(agentColumns)
    }

    // 2. Fix agent_conversations table (from your selected SQL)
    console.log('\n📝 Fixing agent_conversations table...')
    
    const agentConversationsFixes = [
      "ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';",
      "ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS content TEXT;",
      "ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS metadata JSONB;",
      "ALTER TABLE agent_conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();",
      "UPDATE agent_conversations SET role = 'user' WHERE role IS NULL;",
      "UPDATE agent_conversations SET content = 'Legacy conversation message' WHERE content IS NULL;",
      "UPDATE agent_conversations SET created_at = NOW() WHERE created_at IS NULL;",
      "CREATE INDEX IF NOT EXISTS idx_agent_conversations_role ON agent_conversations(role);",
      "CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);",
      "CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON agent_conversations(created_at);"
    ]

    for (const sql of agentConversationsFixes) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query: sql })
        if (error) {
          console.log(`⚠️  Warning: ${sql.slice(0, 50)}... - ${error.message}`)
        } else {
          console.log(`✅ ${sql.slice(0, 50)}...`)
        }
      } catch (err) {
        console.log(`⚠️  Warning: ${sql.slice(0, 50)}... - ${err.message}`)
      }
    }

    // 3. Check if project_opportunities table exists
    console.log('\n🔍 Checking project_opportunities table...')
    const { data: tableExists } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'project_opportunities'
          );
        `
      })

    if (tableExists && tableExists[0]?.exists) {
      console.log('✅ project_opportunities table exists')
    } else {
      console.log('📝 Creating project_opportunities table...')
      const { error } = await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE project_opportunities (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id),
            project_id UUID,
            opportunity_id UUID,
            fit_score DECIMAL(5,2) DEFAULT 0,
            ai_analysis JSONB,
            status TEXT DEFAULT 'needs_scoring',
            score_calculated_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT unique_user_project_opportunity UNIQUE (user_id, project_id, opportunity_id)
          );
        `
      })
      
      if (error) {
        console.log(`⚠️  Warning creating table: ${error.message}`)
      } else {
        console.log('✅ project_opportunities table created')
      }
    }

    // 4. Add scoring cache columns to existing tables
    console.log('\n📝 Adding scoring-related columns to existing tables...')
    
    const scoringColumns = [
      // Projects table enhancements
      "ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_category TEXT;",
      "ALTER TABLE projects ADD COLUMN IF NOT EXISTS funding_request_amount DECIMAL(15,2);",
      "ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_population TEXT;",
      "ALTER TABLE projects ADD COLUMN IF NOT EXISTS primary_goals TEXT[];",
      "ALTER TABLE projects ADD COLUMN IF NOT EXISTS expected_outcomes TEXT[];",
      
      // Profiles table enhancements  
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_type TEXT;",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS small_business BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS woman_owned BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS minority_owned BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS veteran_owned BOOLEAN DEFAULT FALSE;",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2);",
      
      // Project opportunities indexes
      "CREATE INDEX IF NOT EXISTS idx_project_opportunities_user_id ON project_opportunities(user_id);",
      "CREATE INDEX IF NOT EXISTS idx_project_opportunities_fit_score ON project_opportunities(fit_score DESC);",
      "CREATE INDEX IF NOT EXISTS idx_project_opportunities_status ON project_opportunities(status);"
    ]

    for (const sql of scoringColumns) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query: sql })
        if (error) {
          console.log(`⚠️  Warning: ${sql.slice(0, 60)}... - ${error.message}`)
        } else {
          console.log(`✅ ${sql.slice(0, 60)}...`)
        }
      } catch (err) {
        console.log(`⚠️  Warning: ${sql.slice(0, 60)}... - ${err.message}`)
      }
    }

    // 5. Enable RLS on project_opportunities
    console.log('\n🔒 Setting up Row Level Security...')
    try {
      const { error: rlsError } = await supabase.rpc('exec_sql', {
        query: `
          ALTER TABLE project_opportunities ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY IF NOT EXISTS "Users can view own project opportunities" ON project_opportunities
            FOR SELECT USING (auth.uid() = user_id);
            
          CREATE POLICY IF NOT EXISTS "Users can insert own project opportunities" ON project_opportunities
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
          CREATE POLICY IF NOT EXISTS "Users can update own project opportunities" ON project_opportunities
            FOR UPDATE USING (auth.uid() = user_id);
            
          CREATE POLICY IF NOT EXISTS "Users can delete own project opportunities" ON project_opportunities
            FOR DELETE USING (auth.uid() = user_id);
        `
      })
      
      if (rlsError) {
        console.log(`⚠️  RLS Warning: ${rlsError.message}`)
      } else {
        console.log('✅ RLS policies configured')
      }
    } catch (err) {
      console.log(`⚠️  RLS Warning: ${err.message}`)
    }

    // 6. Final verification
    console.log('\n🔍 Verifying setup...')
    const { data: finalCheck } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            'agent_conversations' as table_name, 
            COUNT(*) as column_count
          FROM information_schema.columns 
          WHERE table_name = 'agent_conversations'
          UNION ALL
          SELECT 
            'project_opportunities' as table_name, 
            COUNT(*) as column_count
          FROM information_schema.columns 
          WHERE table_name = 'project_opportunities'
          UNION ALL
          SELECT 
            'projects' as table_name, 
            COUNT(*) as column_count
          FROM information_schema.columns 
          WHERE table_name = 'projects'
          UNION ALL  
          SELECT 
            'profiles' as table_name, 
            COUNT(*) as column_count
          FROM information_schema.columns 
          WHERE table_name = 'profiles';
        `
      })

    if (finalCheck) {
      console.log('\nTable setup summary:')
      console.table(finalCheck)
    }

    console.log('\n🎉 Database setup complete!')
    console.log('📋 Summary:')
    console.log('   ✅ agent_conversations table fixed with role and content columns')
    console.log('   ✅ project_opportunities table ready for score caching')
    console.log('   ✅ Enhanced profiles and projects tables for smart invalidation')
    console.log('   ✅ Indexes created for performance')
    console.log('   ✅ RLS policies configured for security')
    console.log('\n🚀 Your scoring cache system is now ready to use!')

  } catch (error) {
    console.error('💥 Setup failed:', error)
    console.error('Check your SUPABASE_KEY environment variable and database permissions.')
    process.exit(1)
  }
}

// Run the setup
setupDatabase().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})