/**
 * Database Setup API
 * GET /api/setup/database
 * Initializes the AI Assistant database tables in Supabase
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SQL_COMMANDS = [
  // 1. Form Analysis Cache Table
  `CREATE TABLE IF NOT EXISTS form_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_hash VARCHAR(64) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    form_title VARCHAR(255),
    detected_form_type VARCHAR(100),
    analysis_data JSONB NOT NULL,
    enhanced_form_structure JSONB NOT NULL,
    document_complexity VARCHAR(20) DEFAULT 'moderate',
    confidence_score DECIMAL(3,2) DEFAULT 0.85,
    total_fields INTEGER DEFAULT 0,
    data_fields_count INTEGER DEFAULT 0,
    narrative_fields_count INTEGER DEFAULT 0,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1),
    CONSTRAINT valid_complexity CHECK (document_complexity IN ('simple', 'moderate', 'complex', 'high'))
  );`,

  // 2. AI Sessions Table
  `CREATE TABLE IF NOT EXISTS form_ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    project_id UUID REFERENCES projects(id),
    form_analysis_id UUID REFERENCES form_analysis_cache(id),
    session_title VARCHAR(255),
    form_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
  );`,

  // 3. AI Messages Table
  `CREATE TABLE IF NOT EXISTS form_ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES form_ai_sessions(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    field_context VARCHAR(255),
    ai_provider VARCHAR(50),
    ai_model VARCHAR(100),
    response_time INTEGER,
    token_usage JSONB,
    generated_text TEXT,
    field_suggestions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,

  // 4. Indexes
  `CREATE INDEX IF NOT EXISTS idx_form_analysis_cache_file_hash ON form_analysis_cache(file_hash);`,
  `CREATE INDEX IF NOT EXISTS idx_form_analysis_cache_form_type ON form_analysis_cache(detected_form_type);`,
  `CREATE INDEX IF NOT EXISTS idx_form_analysis_cache_created_by ON form_analysis_cache(created_by);`,
  `CREATE INDEX IF NOT EXISTS idx_form_analysis_cache_analyzed_at ON form_analysis_cache(analyzed_at DESC);`,
  
  `CREATE INDEX IF NOT EXISTS idx_form_ai_sessions_user_id ON form_ai_sessions(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_form_ai_sessions_project_id ON form_ai_sessions(project_id);`,
  `CREATE INDEX IF NOT EXISTS idx_form_ai_sessions_active ON form_ai_sessions(is_active, updated_at DESC);`,
  
  `CREATE INDEX IF NOT EXISTS idx_form_ai_messages_session_id ON form_ai_messages(session_id, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_form_ai_messages_field_context ON form_ai_messages(field_context);`,

  // 5. Enable RLS
  `ALTER TABLE form_analysis_cache ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE form_ai_sessions ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE form_ai_messages ENABLE ROW LEVEL SECURITY;`,

  // 6. Helper Function (must be created before policies that might reference it)
  `CREATE OR REPLACE FUNCTION update_form_cache_usage(cache_id UUID)
  RETURNS void AS $$
  BEGIN
    UPDATE form_analysis_cache 
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = cache_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;`,

  // 7. RLS Policies
  `DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own cached forms' AND tablename = 'form_analysis_cache') THEN
      CREATE POLICY "Users can view their own cached forms" ON form_analysis_cache
        FOR SELECT USING (created_by = auth.uid());
    END IF;
  END $$;`,
  
  `DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create form analysis cache' AND tablename = 'form_analysis_cache') THEN
      CREATE POLICY "Users can create form analysis cache" ON form_analysis_cache
        FOR INSERT WITH CHECK (created_by = auth.uid());
    END IF;
  END $$;`,
  
  `DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their cached forms' AND tablename = 'form_analysis_cache') THEN
      CREATE POLICY "Users can update their cached forms" ON form_analysis_cache
        FOR UPDATE USING (created_by = auth.uid());
    END IF;
  END $$;`,
  
  `DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their AI sessions' AND tablename = 'form_ai_sessions') THEN
      CREATE POLICY "Users can manage their AI sessions" ON form_ai_sessions
        FOR ALL USING (user_id = auth.uid());
    END IF;
  END $$;`,
  
  `DO $$ 
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can access messages from their sessions' AND tablename = 'form_ai_messages') THEN
      CREATE POLICY "Users can access messages from their sessions" ON form_ai_messages
        FOR ALL USING (
          session_id IN (
            SELECT id FROM form_ai_sessions WHERE user_id = auth.uid()
          )
        );
    END IF;
  END $$;`,

  // 8. Grants
  `GRANT SELECT, INSERT, UPDATE ON form_analysis_cache TO authenticated;`,
  `GRANT ALL ON form_ai_sessions TO authenticated;`,
  `GRANT ALL ON form_ai_messages TO authenticated;`
]

export async function GET() {
  console.log('🚀 Setting up AI Assistant database tables...')
  
  try {
    const results: Array<{ command: number; success?: boolean; error?: string }> = []
    
    for (let i = 0; i < SQL_COMMANDS.length; i++) {
      const sql = SQL_COMMANDS[i]
      console.log(`Executing command ${i + 1}/${SQL_COMMANDS.length}...`)
      
      const { data, error } = await supabase.rpc('sql', { 
        query: sql.trim()
      })
      
      if (error) {
        console.error(`Error in command ${i + 1}:`, error)
        results.push({ command: i + 1, error: error.message })
      } else {
        results.push({ command: i + 1, success: true })
      }
    }
    
    const hasErrors = results.some(r => r.error)
    
    if (hasErrors) {
      console.log('⚠️  Database setup completed with some errors:', results.filter(r => r.error))
      return NextResponse.json({
        success: false,
        message: 'Database setup completed with errors',
        results
      }, { status: 207 }) // Multi-status
    } else {
      console.log('✅ Database setup completed successfully!')
      return NextResponse.json({
        success: true,
        message: 'AI Assistant database tables created successfully!',
        tablesCreated: [
          'form_analysis_cache',
          'form_ai_sessions', 
          'form_ai_messages'
        ],
        results
      })
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}