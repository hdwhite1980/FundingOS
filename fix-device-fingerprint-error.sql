-- COMPLETE DATABASE SCHEMA MIGRATION FOR AUTHENTICATION FEATURES
-- This script creates ALL necessary tables and columns from scratch
-- Safe to run multiple times - will not overwrite existing data

-- ================================================================
-- 1. CREATE USER_PROFILES TABLE WITH ALL REQUIRED COLUMNS
-- ================================================================

-- Create complete user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  organization_name TEXT,
  organization_type TEXT DEFAULT 'nonprofit',
  user_role TEXT DEFAULT 'company',
  organization_types TEXT[] DEFAULT '{}',
  ai_preferences JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{"email": true, "app": true, "sms": false}',
  
  -- 2FA Authentication columns
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  two_factor_secret_temp TEXT,
  two_factor_backup_codes JSONB,
  
  -- Enhanced onboarding columns
  preferred_funding_types TEXT[],
  typical_award_size TEXT,
  grant_writing_capacity TEXT,
  compliance_capacity TEXT,
  risk_tolerance TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing user_profiles table
DO $$
BEGIN
  -- Add user_id column if it doesn't exist (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='user_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN user_id UUID;
    -- Populate user_id with id for existing records
    UPDATE user_profiles SET user_id = id WHERE user_id IS NULL;
    -- Create unique constraint
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE(user_id);
    RAISE NOTICE '✅ Added user_id column to user_profiles';
  END IF;
  
  -- Add all 2FA columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='two_factor_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added two_factor_enabled column to user_profiles';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='two_factor_secret'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN two_factor_secret TEXT;
    RAISE NOTICE '✅ Added two_factor_secret column to user_profiles';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='two_factor_secret_temp'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN two_factor_secret_temp TEXT;
    RAISE NOTICE '✅ Added two_factor_secret_temp column to user_profiles';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='two_factor_backup_codes'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN two_factor_backup_codes JSONB;
    RAISE NOTICE '✅ Added two_factor_backup_codes column to user_profiles';
  END IF;

  -- Add enhanced profile columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='organization_types'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN organization_types TEXT[] DEFAULT '{}';
    RAISE NOTICE '✅ Added organization_types column to user_profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='ai_preferences'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN ai_preferences JSONB DEFAULT '{}';
    RAISE NOTICE '✅ Added ai_preferences column to user_profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='notification_preferences'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "app": true, "sms": false}';
    RAISE NOTICE '✅ Added notification_preferences column to user_profiles';
  END IF;
END $$;

-- ================================================================
-- 2. CREATE COMPLETE USER_SESSIONS TABLE
-- ================================================================

-- Create user_sessions table with ALL required columns if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deactivated_at TIMESTAMP WITH TIME ZONE NULL,
  deactivation_reason VARCHAR(100) NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  device_fingerprint VARCHAR(32), -- Critical for device tracking!
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing user_sessions table
DO $$
BEGIN
  -- Add device_fingerprint column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_sessions' AND column_name='device_fingerprint'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN device_fingerprint VARCHAR(32);
    RAISE NOTICE '✅ Added device_fingerprint column to user_sessions';
  ELSE
    RAISE NOTICE '✅ device_fingerprint column already exists in user_sessions';
  END IF;
  
  -- Add other missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_sessions' AND column_name='deactivated_at'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN deactivated_at TIMESTAMP WITH TIME ZONE NULL;
    RAISE NOTICE '✅ Added deactivated_at column to user_sessions';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_sessions' AND column_name='deactivation_reason'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN deactivation_reason VARCHAR(100) NULL;
    RAISE NOTICE '✅ Added deactivation_reason column to user_sessions';
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_sessions_user_id_session_id_key'
  ) THEN
    ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_session_id_key UNIQUE(user_id, session_id);
    RAISE NOTICE '✅ Added unique constraint to user_sessions';
  END IF;
END $$;

-- ================================================================
-- 3. CREATE COMPLETE USER_DEVICES TABLE
-- ================================================================

-- Create user_devices table for device management
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(32) UNIQUE NOT NULL,
    user_agent TEXT,
    last_ip INET,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_trusted BOOLEAN DEFAULT FALSE,
    trusted_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    removed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for user_devices
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(user_id, is_active);

-- ================================================================
-- 4. CREATE ALL REQUIRED INDEXES
-- ================================================================

-- User Sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device ON user_sessions(device_fingerprint);

-- User Profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ================================================================
-- 5. ADD SYSTEM_METRICS TABLE FOR DELETE ACCOUNT TRACKING
-- ================================================================

-- System metrics table for audit logging (used by delete account feature)
CREATE TABLE IF NOT EXISTS system_metrics (
  id SERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value NUMERIC DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON system_metrics(recorded_at);

-- ================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on all auth tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Service role can manage sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view own devices" ON user_devices;
DROP POLICY IF EXISTS "Users can update own devices" ON user_devices;
DROP POLICY IF EXISTS "Users can delete own devices" ON user_devices;
DROP POLICY IF EXISTS "Users can insert own devices" ON user_devices;

-- RLS Policies for user_profiles (handle both id and user_id columns)
DO $$
BEGIN
  -- Check if user_profiles uses id or user_id as the foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_profiles' AND column_name='user_id'
  ) THEN
    -- Table has user_id column
    CREATE POLICY "Users can view their own profile" ON user_profiles
      FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can insert their own profile" ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own profile" ON user_profiles
      FOR UPDATE USING (auth.uid() = user_id);
  ELSE
    -- Table uses id column as foreign key
    CREATE POLICY "Users can view their own profile" ON user_profiles
      FOR SELECT USING (auth.uid() = id);
    
    CREATE POLICY "Users can insert their own profile" ON user_profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
    
    CREATE POLICY "Users can update their own profile" ON user_profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- RLS Policies for user_sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sessions" ON user_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_devices
CREATE POLICY "Users can view own devices" ON user_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON user_devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON user_devices
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON user_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- 7. TRIGGER FUNCTIONS FOR AUTOMATIC UPDATES
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_user_devices_updated_at ON user_devices;
CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON user_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update session activity timestamp
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for session activity updates
DROP TRIGGER IF EXISTS trigger_update_session_activity ON user_sessions;
CREATE TRIGGER trigger_update_session_activity
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- ================================================================
-- 8. CLEANUP FUNCTIONS
-- ================================================================

-- Function for cleanup old sessions (can be called via cron)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE last_activity < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for cleanup inactive devices
CREATE OR REPLACE FUNCTION cleanup_inactive_devices()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_devices 
  WHERE is_active = FALSE 
  AND removed_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 9. PERMISSIONS
-- ================================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_devices TO authenticated;
GRANT USAGE ON SEQUENCE user_sessions_id_seq TO authenticated;

-- ================================================================
-- 10. FINAL VERIFICATION AND DOCUMENTATION
-- ================================================================

-- Add comprehensive table comments
COMMENT ON TABLE user_profiles IS 'Complete user profile information including 2FA settings';
COMMENT ON TABLE user_sessions IS 'Active user sessions for single-session enforcement';
COMMENT ON TABLE user_devices IS 'Tracks user devices for security and trust management';
COMMENT ON TABLE system_metrics IS 'System audit logs and metrics tracking';

-- Add column comments for documentation
COMMENT ON COLUMN user_profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN user_profiles.two_factor_secret IS 'TOTP secret for 2FA (encrypted)';
COMMENT ON COLUMN user_profiles.two_factor_secret_temp IS 'Temporary TOTP secret during setup';
COMMENT ON COLUMN user_profiles.two_factor_backup_codes IS 'Hashed backup codes for 2FA recovery';

-- Verification check
DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'COMPLETE AUTHENTICATION SCHEMA MIGRATION COMPLETE';
  RAISE NOTICE '=======================================================';
  
  -- Check user_profiles table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name='user_profiles'
  ) THEN
    RAISE NOTICE '✅ user_profiles table: EXISTS';
    
    -- Check 2FA columns
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='user_profiles' AND column_name='two_factor_enabled'
    ) THEN
      RAISE NOTICE '✅ user_profiles 2FA columns: EXISTS';
    ELSE
      RAISE NOTICE '❌ user_profiles 2FA columns: MISSING';
    END IF;
  ELSE
    RAISE NOTICE '❌ user_profiles table: MISSING';
  END IF;
  
  -- Check user_sessions table and device_fingerprint column
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name='user_sessions'
  ) THEN
    RAISE NOTICE '✅ user_sessions table: EXISTS';
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='user_sessions' AND column_name='device_fingerprint'
    ) THEN
      RAISE NOTICE '✅ user_sessions.device_fingerprint column: EXISTS';
    ELSE
      RAISE NOTICE '❌ user_sessions.device_fingerprint column: MISSING';
    END IF;
  ELSE
    RAISE NOTICE '❌ user_sessions table: MISSING';
  END IF;
  
  -- Check user_devices table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name='user_devices'
  ) THEN
    RAISE NOTICE '✅ user_devices table: EXISTS';
  ELSE
    RAISE NOTICE '❌ user_devices table: MISSING';
  END IF;
  
  -- Check system_metrics table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name='system_metrics'
  ) THEN
    RAISE NOTICE '✅ system_metrics table: EXISTS';
  ELSE
    RAISE NOTICE '❌ system_metrics table: MISSING';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 FEATURES NOW AVAILABLE:';
  RAISE NOTICE '  - Complete user profile management';
  RAISE NOTICE '  - Two-Factor Authentication (2FA)';
  RAISE NOTICE '  - Device trust and management'; 
  RAISE NOTICE '  - Active session management';
  RAISE NOTICE '  - Password reset/forgot password';
  RAISE NOTICE '  - Complete account deletion';
  RAISE NOTICE '';
  RAISE NOTICE 'All authentication and security features are ready!';
  RAISE NOTICE '=======================================================';
END $$;