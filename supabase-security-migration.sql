-- SUPABASE-SPECIFIC SECURITY FEATURES MIGRATION
-- This script is tailored for Supabase's PostgreSQL with proper schema handling
-- Run this in your Supabase SQL editor or via the Supabase CLI

-- ================================================================
-- 1. ADD 2FA COLUMNS TO EXISTING USER_PROFILES TABLE
-- ================================================================

-- Add 2FA columns to user_profiles (assumes table already exists)
DO $$
BEGIN
  -- Add two_factor_enabled column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'two_factor_enabled'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added two_factor_enabled column to user_profiles';
  ELSE
    RAISE NOTICE '✅ two_factor_enabled column already exists';
  END IF;
  
  -- Add two_factor_secret column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'two_factor_secret'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN two_factor_secret TEXT;
    RAISE NOTICE '✅ Added two_factor_secret column to user_profiles';
  ELSE
    RAISE NOTICE '✅ two_factor_secret column already exists';
  END IF;
  
  -- Add two_factor_secret_temp column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'two_factor_secret_temp'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN two_factor_secret_temp TEXT;
    RAISE NOTICE '✅ Added two_factor_secret_temp column to user_profiles';
  ELSE
    RAISE NOTICE '✅ two_factor_secret_temp column already exists';
  END IF;
  
  -- Add two_factor_backup_codes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'two_factor_backup_codes'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN two_factor_backup_codes JSONB;
    RAISE NOTICE '✅ Added two_factor_backup_codes column to user_profiles';
  ELSE
    RAISE NOTICE '✅ two_factor_backup_codes column already exists';
  END IF;
END $$;

-- ================================================================
-- 2. CREATE USER_SESSIONS TABLE (FOR ACTIVE SESSION MANAGEMENT)
-- ================================================================

-- Create user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ,
  deactivation_reason VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  device_fingerprint VARCHAR(32),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint for user sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_sessions_user_id_session_id_key'
    AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    ALTER TABLE public.user_sessions 
    ADD CONSTRAINT user_sessions_user_id_session_id_key UNIQUE(user_id, session_id);
    RAISE NOTICE '✅ Added unique constraint to user_sessions';
  ELSE
    RAISE NOTICE '✅ Unique constraint already exists on user_sessions';
  END IF;
END $$;

-- ================================================================
-- 3. CREATE USER_DEVICES TABLE (FOR DEVICE MANAGEMENT)
-- ================================================================

-- Create user_devices table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_devices (
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

-- ================================================================
-- 4. CREATE SYSTEM_METRICS TABLE (FOR AUDIT LOGGING)
-- ================================================================

-- Create system_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value NUMERIC DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ================================================================

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON public.user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device ON public.user_sessions(device_fingerprint);

-- Indexes for user_devices
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON public.user_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON public.user_devices(user_id, is_active);

-- Indexes for system_metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON public.system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded ON public.system_metrics(recorded_at);

-- ================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS) - SUPABASE STYLE
-- ================================================================

-- Enable RLS on new tables
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 7. CREATE RLS POLICIES FOR SUPABASE
-- ================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.user_sessions;

DROP POLICY IF EXISTS "Users can view own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can insert own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can update own devices" ON public.user_devices;
DROP POLICY IF EXISTS "Users can delete own devices" ON public.user_devices;

DROP POLICY IF EXISTS "System metrics are read-only for authenticated users" ON public.system_metrics;
DROP POLICY IF EXISTS "Service role can manage system metrics" ON public.system_metrics;

-- RLS Policies for user_sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to manage all sessions (for session management)
CREATE POLICY "Service role can manage all sessions" ON public.user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_devices
CREATE POLICY "Users can view own devices" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for system_metrics
CREATE POLICY "System metrics are read-only for authenticated users" ON public.system_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage system metrics" ON public.system_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- ================================================================
-- 8. CREATE TRIGGER FUNCTIONS FOR AUTO-UPDATES
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS set_updated_at ON public.user_sessions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.user_devices;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ================================================================
-- 9. CREATE HELPER FUNCTIONS FOR CLEANUP
-- ================================================================

-- Function to cleanup old sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_sessions 
  WHERE last_activity < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO public.system_metrics (metric_type, value, metadata)
  VALUES ('session_cleanup', deleted_count, jsonb_build_object('cleanup_date', NOW()));
  
  RETURN deleted_count;
END;
$$;

-- Function to cleanup inactive devices
CREATE OR REPLACE FUNCTION public.cleanup_inactive_devices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_devices 
  WHERE is_active = FALSE 
  AND removed_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO public.system_metrics (metric_type, value, metadata)
  VALUES ('device_cleanup', deleted_count, jsonb_build_object('cleanup_date', NOW()));
  
  RETURN deleted_count;
END;
$$;

-- ================================================================
-- 10. FINAL VERIFICATION
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '🔒 SUPABASE SECURITY FEATURES MIGRATION COMPLETE';
  RAISE NOTICE '=======================================================';
  
  -- Check user_profiles 2FA columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'user_profiles' 
    AND column_name = 'two_factor_enabled'
  ) THEN
    RAISE NOTICE '✅ 2FA columns added to user_profiles';
  ELSE
    RAISE NOTICE '❌ 2FA columns missing from user_profiles';
  END IF;
  
  -- Check user_sessions table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'user_sessions'
  ) THEN
    RAISE NOTICE '✅ user_sessions table created';
  ELSE
    RAISE NOTICE '❌ user_sessions table missing';
  END IF;
  
  -- Check user_devices table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'user_devices'
  ) THEN
    RAISE NOTICE '✅ user_devices table created';
  ELSE
    RAISE NOTICE '❌ user_devices table missing';
  END IF;
  
  -- Check system_metrics table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'system_metrics'
  ) THEN
    RAISE NOTICE '✅ system_metrics table created';
  ELSE
    RAISE NOTICE '❌ system_metrics table missing';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 SECURITY FEATURES NOW AVAILABLE:';
  RAISE NOTICE '  - Two-Factor Authentication (2FA)';
  RAISE NOTICE '  - Active Session Management';
  RAISE NOTICE '  - Device Trust Management';
  RAISE NOTICE '  - System Audit Logging';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEPS:';
  RAISE NOTICE '  1. Test the Account Settings Security tab';
  RAISE NOTICE '  2. Verify API endpoints work correctly';
  RAISE NOTICE '  3. Test 2FA setup/disable functionality';
  RAISE NOTICE '';
  RAISE NOTICE '=======================================================';
END $$;