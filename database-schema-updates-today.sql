-- DATABASE SCHEMA UPDATES SUMMARY FOR NEW FEATURES
-- Summary of all database changes needed for today's additions

-- ================================================================
-- AUTHENTICATION & SECURITY FEATURES ADDED TODAY
-- ================================================================

/*
NEW FEATURES IMPLEMENTED TODAY:
1. Password Reset & Forgot Password
2. Two-Factor Authentication (2FA) with TOTP
3. Session Management & Active Sessions
4. Device Management & Trusted Devices  
5. Account Deletion with Complete Data Removal

REQUIRED DATABASE UPDATES:
*/

-- ================================================================
-- 1. USER PROFILES ENHANCEMENTS (2FA Support)
-- ================================================================

-- Add 2FA columns to existing user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_secret_temp TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN user_profiles.two_factor_secret IS 'TOTP secret for 2FA (encrypted)';
COMMENT ON COLUMN user_profiles.two_factor_secret_temp IS 'Temporary TOTP secret during setup';
COMMENT ON COLUMN user_profiles.two_factor_backup_codes IS 'Hashed backup codes for 2FA recovery';

-- ================================================================
-- 2. USER SESSIONS TABLE (Session Management)
-- ================================================================

-- Create user_sessions table if it doesn't exist
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
  device_fingerprint VARCHAR(32), -- Added for device tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint separately to handle existing tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_sessions_user_id_session_id_key'
  ) THEN
    ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_user_id_session_id_key UNIQUE(user_id, session_id);
  END IF;
END $$;

-- Add device_fingerprint column if missing (fixes the error)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='user_sessions' AND column_name='device_fingerprint'
  ) THEN
    ALTER TABLE user_sessions ADD COLUMN device_fingerprint VARCHAR(32);
    RAISE NOTICE '✅ Added missing device_fingerprint column to user_sessions';
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device ON user_sessions(device_fingerprint);

-- ================================================================
-- 3. USER DEVICES TABLE (Device Management)
-- ================================================================

-- Create user_devices table for device management
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on new tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

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
-- 5. TRIGGER FUNCTIONS FOR AUTOMATIC UPDATES
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
CREATE TRIGGER trigger_update_session_activity
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- ================================================================
-- 6. CLEANUP FUNCTIONS
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
-- 7. PERMISSIONS
-- ================================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_devices TO authenticated;
GRANT USAGE ON SEQUENCE user_sessions_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE user_devices_id_seq TO authenticated;

-- ================================================================
-- 8. VERIFICATION QUERIES
-- ================================================================

-- Check if all required columns exist
DO $$
BEGIN
  -- Check user_profiles columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='user_profiles' AND column_name='two_factor_enabled') THEN
    RAISE NOTICE '❌ Missing: user_profiles.two_factor_enabled';
  ELSE
    RAISE NOTICE '✅ Found: user_profiles.two_factor_enabled';
  END IF;
  
  -- Check user_sessions table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_name='user_sessions') THEN
    RAISE NOTICE '❌ Missing: user_sessions table';
  ELSE
    RAISE NOTICE '✅ Found: user_sessions table';
  END IF;
  
  -- Check user_devices table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                WHERE table_name='user_devices') THEN
    RAISE NOTICE '❌ Missing: user_devices table';
  ELSE
    RAISE NOTICE '✅ Found: user_devices table';
  END IF;
END $$;

-- ================================================================
-- SUMMARY OF CHANGES
-- ================================================================

/*
SUMMARY OF DATABASE SCHEMA UPDATES REQUIRED:

1. user_profiles table:
   - two_factor_enabled (BOOLEAN)
   - two_factor_secret (TEXT)
   - two_factor_secret_temp (TEXT)  
   - two_factor_backup_codes (JSONB)

2. user_sessions table (NEW):
   - Complete session tracking with device fingerprinting
   - RLS policies for user data isolation
   - Automatic cleanup functions

3. user_devices table (NEW):
   - Device management and trust tracking
   - IP and user agent logging
   - RLS policies for security

4. Functions & Triggers:
   - Automatic timestamp updates
   - Session cleanup
   - Device cleanup

5. Indexes:
   - Performance indexes on all new tables
   - Query optimization for authentication flows

6. Security:
   - Row Level Security on all new tables
   - Proper user data isolation
   - Service role permissions for admin functions

TO APPLY THESE UPDATES:
1. Run the SQL statements above in your Supabase SQL editor
2. Or execute the provided migration files:
   - database_auth_security_migration.sql
   - database_user_sessions.sql
3. Verify the changes with the verification queries

These updates enable all the authentication and security features 
implemented today including 2FA, session management, device tracking,
and secure account deletion.
*/

-- ================================================================
-- COMPLETION MESSAGE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'FundingOS Authentication Security Schema Updates';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Required updates for today''s new features:';
  RAISE NOTICE '✅ Two-Factor Authentication (2FA)';
  RAISE NOTICE '✅ Session Management'; 
  RAISE NOTICE '✅ Device Management';
  RAISE NOTICE '✅ Password Reset & Forgot Password';
  RAISE NOTICE '✅ Account Deletion';
  RAISE NOTICE '';
  RAISE NOTICE 'Execute this script in Supabase SQL Editor to apply all updates.';
  RAISE NOTICE '=======================================================';
END $$;