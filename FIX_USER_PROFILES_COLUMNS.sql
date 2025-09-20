-- Fix for missing columns in existing user_profiles table
-- Run this SQL in your Supabase SQL Editor if you're getting column errors

-- Add missing columns to user_profiles table
DO $$
BEGIN
  -- Add organization_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN organization_id VARCHAR(100);
    RAISE NOTICE 'Added organization_id column to user_profiles';
  ELSE
    RAISE NOTICE 'organization_id column already exists in user_profiles';
  END IF;

  -- Add ein if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'ein'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN ein VARCHAR(20);
    RAISE NOTICE 'Added ein column to user_profiles';
  ELSE
    RAISE NOTICE 'ein column already exists in user_profiles';
  END IF;

  -- Add tax_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'tax_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN tax_id VARCHAR(20);
    RAISE NOTICE 'Added tax_id column to user_profiles';
  ELSE
    RAISE NOTICE 'tax_id column already exists in user_profiles';
  END IF;

  -- Add address if missing (for contextBuilder compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN address TEXT;
    RAISE NOTICE 'Added address column to user_profiles';
  ELSE
    RAISE NOTICE 'address column already exists in user_profiles';
  END IF;

  -- Add location if missing (for contextBuilder compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN location TEXT;
    RAISE NOTICE 'Added location column to user_profiles';
  ELSE
    RAISE NOTICE 'location column already exists in user_profiles';
  END IF;

  -- Add annual_budget if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'annual_budget'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN annual_budget BIGINT;
    RAISE NOTICE 'Added annual_budget column to user_profiles';
  ELSE
    RAISE NOTICE 'annual_budget column already exists in user_profiles';
  END IF;

  -- Add years_in_operation if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'years_in_operation'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN years_in_operation INTEGER;
    RAISE NOTICE 'Added years_in_operation column to user_profiles';
  ELSE
    RAISE NOTICE 'years_in_operation column already exists in user_profiles';
  END IF;

  -- Add years_operating if missing (alternative field name used by some forms)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'years_operating'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN years_operating INTEGER;
    RAISE NOTICE 'Added years_operating column to user_profiles';
  ELSE
    RAISE NOTICE 'years_operating column already exists in user_profiles';
  END IF;

  -- Add full_time_staff if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'full_time_staff'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_time_staff INTEGER;
    RAISE NOTICE 'Added full_time_staff column to user_profiles';
  ELSE
    RAISE NOTICE 'full_time_staff column already exists in user_profiles';
  END IF;

  -- Add employee_count if missing (alternative field name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'employee_count'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN employee_count INTEGER;
    RAISE NOTICE 'Added employee_count column to user_profiles';
  ELSE
    RAISE NOTICE 'employee_count column already exists in user_profiles';
  END IF;

  -- Add board_size if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'board_size'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN board_size INTEGER;
    RAISE NOTICE 'Added board_size column to user_profiles';
  ELSE
    RAISE NOTICE 'board_size column already exists in user_profiles';
  END IF;

  -- Add board_members if missing (alternative field name)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'board_members'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN board_members INTEGER;
    RAISE NOTICE 'Added board_members column to user_profiles';
  ELSE
    RAISE NOTICE 'board_members column already exists in user_profiles';
  END IF;

  -- Add organization_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'organization_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN organization_type VARCHAR(100);
    RAISE NOTICE 'Added organization_type column to user_profiles';
  ELSE
    RAISE NOTICE 'organization_type column already exists in user_profiles';
  END IF;

  -- Add website if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN website VARCHAR(255);
    RAISE NOTICE 'Added website column to user_profiles';
  ELSE
    RAISE NOTICE 'website column already exists in user_profiles';
  END IF;

END $$;

-- Ensure RLS is enabled on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Add/update RLS policy for user_profiles
DROP POLICY IF EXISTS "Users own their profiles" ON user_profiles;
CREATE POLICY "Users own their profiles" ON user_profiles FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;