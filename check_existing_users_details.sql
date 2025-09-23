-- Check existing users in your system
-- This will help us understand why the system can't find that specific tenant ID

-- 1. Check how many users you have in user_profiles
SELECT 
    'TOTAL USERS IN SYSTEM' as check_type,
    COUNT(*) as user_count
FROM public.user_profiles;

-- 2. Check if that specific tenant ID exists
SELECT 
    'SPECIFIC TENANT CHECK' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = '1134a8c4-7dce-4b1f-8b97-247580e16e9c') 
        THEN 'USER EXISTS' 
        ELSE 'USER NOT FOUND' 
    END as status;

-- 3. Show first 5 users with their actual IDs (for testing with real tenant IDs)
SELECT 
    'ACTUAL USERS' as info_type,
    user_id,
    email,
    organization_name,
    setup_completed,
    created_at
FROM public.user_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Check if the missing user might be in auth.users but not user_profiles
SELECT 
    'USERS IN AUTH BUT NOT PROFILES' as check_type,
    COUNT(*) as orphaned_users
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL;

-- 5. Show any orphaned users (in auth.users but not user_profiles)
SELECT 
    'ORPHANED AUTH USERS' as info_type,
    au.id as user_id,
    au.email,
    au.created_at,
    'Missing from user_profiles' as issue
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id
WHERE up.user_id IS NULL
ORDER BY au.created_at DESC
LIMIT 5;