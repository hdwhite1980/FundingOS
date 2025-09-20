-- AI Assistant Database Schema for Supabase
-- Run these commands in your Supabase SQL Editor

-- 1. Form Analysis Cache Table
CREATE TABLE IF NOT EXISTS form_analysis_cache (
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
);

-- 2. AI Sessions Table
CREATE TABLE IF NOT EXISTS form_ai_sessions (
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
);

-- 3. AI Messages Table
CREATE TABLE IF NOT EXISTS form_ai_messages (
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
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_form_analysis_cache_file_hash ON form_analysis_cache(file_hash);
CREATE INDEX IF NOT EXISTS idx_form_analysis_cache_form_type ON form_analysis_cache(detected_form_type);
CREATE INDEX IF NOT EXISTS idx_form_analysis_cache_created_by ON form_analysis_cache(created_by);
CREATE INDEX IF NOT EXISTS idx_form_analysis_cache_analyzed_at ON form_analysis_cache(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_ai_sessions_user_id ON form_ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_ai_sessions_project_id ON form_ai_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_form_ai_sessions_active ON form_ai_sessions(is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_ai_messages_session_id ON form_ai_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_form_ai_messages_field_context ON form_ai_messages(field_context);

-- 5. Enable RLS
ALTER TABLE form_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_ai_messages ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
-- Form analysis cache policies
CREATE POLICY "Users can view their own cached forms" ON form_analysis_cache
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create form analysis cache" ON form_analysis_cache
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their cached forms" ON form_analysis_cache
  FOR UPDATE USING (created_by = auth.uid());

-- AI session policies  
CREATE POLICY "Users can manage their AI sessions" ON form_ai_sessions
  FOR ALL USING (user_id = auth.uid());

-- AI message policies
CREATE POLICY "Users can access messages from their sessions" ON form_ai_messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM form_ai_sessions WHERE user_id = auth.uid()
    )
  );

-- 7. Helper Functions
CREATE OR REPLACE FUNCTION update_form_cache_usage(cache_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE form_analysis_cache 
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant Permissions
GRANT SELECT, INSERT, UPDATE ON form_analysis_cache TO authenticated;
GRANT ALL ON form_ai_sessions TO authenticated;
GRANT ALL ON form_ai_messages TO authenticated;