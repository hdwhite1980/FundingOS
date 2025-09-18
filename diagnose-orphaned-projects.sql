-- Diagnose and fix orphaned projects after RLS re-enable
-- Run this in Supabase SQL Editor

-- 1. Check what projects exist and their user_id values
DO $$
BEGIN
    RAISE NOTICE '🔍 CHECKING PROJECTS TABLE CONTENTS';
END $$;

-- Show all projects with their user_id values
SELECT 
    id,
    name,
    user_id,
    created_at,
    CASE 
        WHEN user_id IS NULL THEN '❌ NULL user_id (orphaned)'
        ELSE '✅ Has user_id'
    END as status
FROM projects 
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check current authentication context
DO $$
BEGIN
    RAISE NOTICE '🔍 CHECKING CURRENT AUTH CONTEXT';
    RAISE NOTICE '   Current auth.uid(): %', auth.uid();
    
    IF auth.uid() IS NULL THEN
        RAISE NOTICE '❌ You are not authenticated in this SQL session';
        RAISE NOTICE '   This is normal - SQL Editor runs as service role';
    ELSE
        RAISE NOTICE '✅ Authenticated as: %', auth.uid();
    END IF;
END $$;

-- 3. Show user profiles to get the correct user_id
SELECT 
    user_id,
    email,
    full_name,
    organization_name,
    created_at
FROM user_profiles 
ORDER BY created_at DESC
LIMIT 5;

-- 4. Instructions for fixing orphaned projects
DO $$
BEGIN
    RAISE NOTICE '📋 TO FIX ORPHANED PROJECTS:';
    RAISE NOTICE '   1. Copy your user_id from the user_profiles result above';
    RAISE NOTICE '   2. Run the UPDATE command below with your actual user_id';
    RAISE NOTICE '   3. Replace YOUR_USER_ID_HERE with your actual UUID';
    RAISE NOTICE '';
    RAISE NOTICE 'UPDATE projects SET user_id = ''YOUR_USER_ID_HERE'' WHERE user_id IS NULL;';
END $$;