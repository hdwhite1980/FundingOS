-- Missing Database Tables for WALI-OS Assistant
-- Run this SQL in your Supabase SQL Editor to add missing tables

-- 1. User Profiles Table (CRITICAL - Referenced by contextBuilder)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  organization_name VARCHAR(255),
  organization_id VARCHAR(100),
  company VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  phone VARCHAR(20),
  -- Additional fields for AI context (EIN, tax info, org capacity)
  ein VARCHAR(20),
  tax_id VARCHAR(20),
  address TEXT, -- Combined address field for backward compatibility
  location TEXT, -- Location field for backward compatibility
  annual_budget BIGINT,
  years_in_operation INTEGER,
  years_operating INTEGER, -- Alternative field name
  full_time_staff INTEGER,
  employee_count INTEGER, -- Alternative field name  
  board_size INTEGER,
  board_members INTEGER, -- Alternative field name
  part_time_staff INTEGER,
  volunteers INTEGER,
  incorporation_year INTEGER,
  indirect_cost_rate DECIMAL(5,2),
  organization_type VARCHAR(100),
  website VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Assistant Sessions Table
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
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON user_profiles(organization_name, organization_id);
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_user_id ON assistant_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_session ON assistant_conversations(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_org_context_cache_refreshed ON ai_org_context_cache(refreshed_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_org_name ON company_settings(organization_name);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;  
ALTER TABLE ai_org_context_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users own their profiles" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their assistant sessions" ON assistant_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their conversations" ON assistant_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their context cache" ON ai_org_context_cache FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their company settings" ON company_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their user settings" ON user_settings FOR ALL USING (auth.uid() = user_id);

-- Grants
GRANT ALL ON user_profiles TO authenticated;
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

-- ============================================================================
-- ALTER STATEMENTS FOR EXISTING TABLES
-- Run these if user_profiles table already exists but is missing columns
-- ============================================================================

-- Add missing columns to existing user_profiles table
DO $$
BEGIN
  -- Add organization_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN organization_id VARCHAR(100);
  END IF;

  -- Add ein if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'ein'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN ein VARCHAR(20);
  END IF;

  -- Add tax_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'tax_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN tax_id VARCHAR(20);
  END IF;

  -- Add address if missing (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN address TEXT;
  END IF;

  -- Add location if missing (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN location TEXT;
  END IF;

  -- Add annual_budget if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'annual_budget'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN annual_budget BIGINT;
  END IF;

  -- Add years_in_operation if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'years_in_operation'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN years_in_operation INTEGER;
  END IF;

  -- Add years_operating if missing (alternative field name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'years_operating'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN years_operating INTEGER;
  END IF;

  -- Add full_time_staff if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'full_time_staff'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_time_staff INTEGER;
  END IF;

  -- Add employee_count if missing (alternative field name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'employee_count'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN employee_count INTEGER;
  END IF;

  -- Add board_size if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'board_size'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN board_size INTEGER;
  END IF;

  -- Add board_members if missing (alternative field name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'board_members'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN board_members INTEGER;
  END IF;

  -- Add part_time_staff if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'part_time_staff'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN part_time_staff INTEGER;
  END IF;

  -- Add volunteers if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'volunteers'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN volunteers INTEGER;
  END IF;

  -- Add incorporation_year if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'incorporation_year'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN incorporation_year INTEGER;
  END IF;

  -- Add indirect_cost_rate if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'indirect_cost_rate'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN indirect_cost_rate DECIMAL(5,2);
  END IF;

  -- Add organization_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'organization_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN organization_type VARCHAR(100);
  END IF;

  -- Add website if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN website VARCHAR(255);
  END IF;

END $$;

-- Add RLS policy for user_profiles if table already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_profiles') THEN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Users own their profiles" ON user_profiles;
    -- Create the policy
    CREATE POLICY "Users own their profiles" ON user_profiles FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;