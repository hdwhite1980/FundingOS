-- Check user profiles to debug the null profile issue
-- This helps identify why userContext.profile is null

-- 1. Check if user_profiles table exists and has data
SELECT COUNT(*) as total_profiles FROM user_profiles;

-- 2. Check the structure of user_profiles table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- 3. Check for profiles with missing organization_type
SELECT 
  user_id,
  organization_type,
  organization_name,
  setup_completed,
  created_at
FROM user_profiles 
WHERE organization_type IS NULL 
   OR organization_type = '' 
   OR organization_type = 'unknown'
LIMIT 10;

-- 4. Check recent profiles (to see current data)
SELECT 
  user_id,
  organization_type,
  organization_name,
  setup_completed,
  created_at
FROM user_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check if there are profiles with the specific user ID from your logs
-- (Replace 'your-user-id-here' with the actual user ID from the error)
-- SELECT * FROM user_profiles WHERE user_id = 'your-user-id-here';