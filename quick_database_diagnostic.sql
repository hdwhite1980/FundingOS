-- Quick Database Diagnostic for "Database not configured" Error
-- Run this in Supabase SQL Editor to identify the specific issue

-- Check 1: Do critical tables exist?
SELECT 
    'CRITICAL TABLES STATUS' as diagnostic_type,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN 'EXISTS' ELSE 'MISSING' END) as user_profiles,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings' AND table_schema = 'public') THEN 'EXISTS' ELSE 'MISSING' END) as company_settings,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunities' AND table_schema = 'public') THEN 'EXISTS' ELSE 'MISSING' END) as opportunities;

-- Check 2: Do UFA tables exist?
SELECT 
    'UFA TABLES STATUS' as diagnostic_type,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_analysis_results' AND table_schema = 'public') THEN 'EXISTS' ELSE 'MISSING' END) as ufa_analysis_results,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_strategic_goals' AND table_schema = 'public') THEN 'EXISTS' ELSE 'MISSING' END) as ufa_strategic_goals,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_notifications' AND table_schema = 'public') THEN 'EXISTS' ELSE 'MISSING' END) as ufa_notifications;

-- Check 3: Data counts in critical tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        RAISE NOTICE 'user_profiles count: %', (SELECT COUNT(*) FROM user_profiles);
    ELSE
        RAISE NOTICE 'user_profiles table: MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings' AND table_schema = 'public') THEN
        RAISE NOTICE 'company_settings count: %', (SELECT COUNT(*) FROM company_settings);
    ELSE
        RAISE NOTICE 'company_settings table: MISSING';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunities' AND table_schema = 'public') THEN
        RAISE NOTICE 'opportunities count: %', (SELECT COUNT(*) FROM opportunities);
    ELSE
        RAISE NOTICE 'opportunities table: MISSING';
    END IF;
END $$;

-- Check 4: Authentication setup
SELECT 
    'AUTH STATUS' as diagnostic_type,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') THEN 'SUPABASE_AUTH_ENABLED' ELSE 'AUTH_MISSING' END) as auth_status;

-- Check 5: All public tables that do exist
SELECT 
    'EXISTING PUBLIC TABLES' as diagnostic_type,
    COUNT(*) as total_public_tables,
    STRING_AGG(table_name, ', ' ORDER BY table_name) as table_names
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Final diagnosis
SELECT 
    'DIAGNOSIS' as diagnostic_type,
    'Based on results above, next steps:' as next_steps,
    '1. If core tables MISSING: You need to run database migrations' as step_1,
    '2. If UFA tables MISSING: Run create_missing_ufa_tables.sql' as step_2,
    '3. If tables exist but counts are 0: You need sample data' as step_3,
    '4. Check your .env variables match your database' as step_4;