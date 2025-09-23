-- Check existing users and create test data if needed
-- Run this AFTER creating the auth tables

-- Check if any users exist
SELECT 
    'EXISTING USERS' as check_type,
    COUNT(*) as user_count
FROM auth.users;

-- Check if user_profiles table exists and has data
SELECT 
    'USER PROFILES' as check_type,
    COUNT(*) as profile_count
FROM user_profiles;

-- Show actual user IDs that exist (if any)
SELECT 
    'VALID TENANT IDS' as info,
    id as tenant_id,
    email,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;