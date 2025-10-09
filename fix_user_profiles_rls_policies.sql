-- CRITICAL FIX: Remove duplicate and incorrect RLS policies from user_profiles
-- The table uses 'user_id' as the foreign key to auth.users, NOT 'id'
-- Run this in Supabase SQL Editor

-- 1. Drop all existing policies (except service_role)
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users own their profiles" ON user_profiles;

-- 2. Keep the service role policy (it's correct)
-- Already exists: "Allow service role full access"

-- 3. Create clean, correct policies using 'user_id'
CREATE POLICY "authenticated_select_own_profile" ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "authenticated_insert_own_profile" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_update_own_profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_delete_own_profile" ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Verify the policies
SELECT 
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY policyname;
