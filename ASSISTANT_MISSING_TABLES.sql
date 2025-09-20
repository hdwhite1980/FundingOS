-- Missing Database Tables for WALI-OS Assistant
-- Run this SQL in your Supabase SQL Editor to add missing tables

-- 1. Assistant Sessions Table
CREATE TABLE IF NOT EXISTS assistant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 2. Assistant Conversations Table  
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. AI Organization Context Cache Table
CREATE TABLE IF NOT EXISTS ai_org_context_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  context_version VARCHAR(10) NOT NULL DEFAULT '1',
  context_hash VARCHAR(100),
  context_json JSONB NOT NULL,
  refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, context_version)
);

-- 4. Company Settings Table (for EIN, organization info)
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name VARCHAR(255),
  organization_id VARCHAR(100),
  ein VARCHAR(20),
  tax_id VARCHAR(20),
  duns_number VARCHAR(15),
  cage_code VARCHAR(10),
  organization_type VARCHAR(100),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  phone VARCHAR(20),
  website VARCHAR(255),
  contact_person VARCHAR(255),
  contact_title VARCHAR(255),
  contact_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  ui_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_user_id ON assistant_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_session ON assistant_conversations(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_org_context_cache_refreshed ON ai_org_context_cache(refreshed_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_org_name ON company_settings(organization_name);

-- Enable RLS
ALTER TABLE assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;  
ALTER TABLE ai_org_context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users own their assistant sessions" ON assistant_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their conversations" ON assistant_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their context cache" ON ai_org_context_cache FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their company settings" ON company_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their user settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Grants
GRANT ALL ON assistant_sessions TO authenticated;
GRANT ALL ON assistant_conversations TO authenticated;
GRANT ALL ON ai_org_context_cache TO authenticated;
GRANT ALL ON company_settings TO authenticated;
GRANT ALL ON user_settings TO authenticated;

-- Trigger to update last interaction time
CREATE OR REPLACE FUNCTION update_assistant_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assistant_sessions 
  SET last_interaction_at = NOW() 
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_assistant_session
  AFTER INSERT ON assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION update_assistant_session_timestamp();