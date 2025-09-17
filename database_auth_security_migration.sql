-- Authentication Security Enhancement Migration
-- Add columns for 2FA, device management, and enhanced session tracking

-- Add 2FA columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS two_factor_secret_temp TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB;

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

-- Enhance user_sessions table if it exists (add device tracking)
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(32);

-- Add index for device fingerprint in sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_device ON user_sessions(device_fingerprint);

-- Add RLS policies for user_devices
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own devices
CREATE POLICY "Users can view own devices" ON user_devices
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own devices
CREATE POLICY "Users can update own devices" ON user_devices
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own devices
CREATE POLICY "Users can delete own devices" ON user_devices
    FOR DELETE USING (auth.uid() = user_id);

-- Policy: Users can insert their own devices
CREATE POLICY "Users can insert own devices" ON user_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_devices updated_at
CREATE TRIGGER update_user_devices_updated_at BEFORE UPDATE ON user_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_devices IS 'Tracks user devices for security and trust management';
COMMENT ON COLUMN user_profiles.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN user_profiles.two_factor_secret IS 'TOTP secret for 2FA (encrypted)';
COMMENT ON COLUMN user_profiles.two_factor_secret_temp IS 'Temporary TOTP secret during setup';
COMMENT ON COLUMN user_profiles.two_factor_backup_codes IS 'Hashed backup codes for 2FA recovery';

-- Grant necessary permissions (adjust based on your setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON user_devices TO authenticated;
GRANT USAGE ON SEQUENCE user_devices_id_seq TO authenticated;