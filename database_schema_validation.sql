-- Comprehensive Database Schema Validation for FundingOS UFA System
-- Run this query in Supabase SQL Editor to check for missing tables/columns

-- =====================================================
-- SECTION 1: Check for Essential Tables
-- =====================================================
SELECT 
    'TABLE EXISTENCE CHECK' as check_type,
    'Core Tables' as category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') 
        THEN '✅ user_profiles EXISTS'
        ELSE '❌ user_profiles MISSING - CRITICAL'
    END as user_profiles_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings' AND table_schema = 'public') 
        THEN '✅ company_settings EXISTS'
        ELSE '❌ company_settings MISSING - CRITICAL'
    END as company_settings_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunities' AND table_schema = 'public') 
        THEN '✅ opportunities EXISTS'
        ELSE '❌ opportunities MISSING - CRITICAL'
    END as opportunities_status;

-- =====================================================
-- SECTION 2: Check for UFA-Specific Tables
-- =====================================================
SELECT 
    'UFA TABLES CHECK' as check_type,
    'UFA System' as category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_analysis_results' AND table_schema = 'public') 
        THEN '✅ ufa_analysis_results EXISTS'
        ELSE '❌ ufa_analysis_results MISSING - Create for UFA data storage'
    END as ufa_analysis_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_strategic_goals' AND table_schema = 'public') 
        THEN '✅ ufa_strategic_goals EXISTS'
        ELSE '❌ ufa_strategic_goals MISSING - Create for goals tracking'
    END as ufa_goals_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_notifications' AND table_schema = 'public') 
        THEN '✅ ufa_notifications EXISTS'
        ELSE '❌ ufa_notifications MISSING - Create for notification system'
    END as ufa_notifications_status;

-- =====================================================
-- SECTION 3: Check for SBA Intelligence Tables
-- =====================================================
SELECT 
    'SBA INTELLIGENCE CHECK' as check_type,
    'SBA System' as category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_sba_knowledge_base' AND table_schema = 'public') 
        THEN '✅ ufa_sba_knowledge_base EXISTS'
        ELSE '❌ ufa_sba_knowledge_base MISSING - Create for SBA data'
    END as sba_knowledge_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_sba_programs' AND table_schema = 'public') 
        THEN '✅ ufa_sba_programs EXISTS'
        ELSE '❌ ufa_sba_programs MISSING - Create for SBA programs'
    END as sba_programs_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_sba_readiness_assessments' AND table_schema = 'public') 
        THEN '✅ ufa_sba_readiness_assessments EXISTS'
        ELSE '❌ ufa_sba_readiness_assessments MISSING - Create for readiness tracking'
    END as sba_readiness_status;

-- =====================================================
-- SECTION 4: Check Essential Columns in Core Tables
-- =====================================================
-- Check user_profiles columns
SELECT 
    'COLUMN CHECK' as check_type,
    'user_profiles columns' as category,
    CASE WHEN column_name = 'tenant_id' THEN '✅ tenant_id EXISTS' END as tenant_id,
    CASE WHEN column_name = 'email' THEN '✅ email EXISTS' END as email,
    CASE WHEN column_name = 'industry' THEN '✅ industry EXISTS' END as industry,
    CASE WHEN column_name = 'bio' THEN '✅ bio EXISTS' END as bio,
    CASE WHEN column_name = 'website' THEN '✅ website EXISTS' END as website
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'
AND column_name IN ('tenant_id', 'email', 'industry', 'bio', 'website');

-- Check company_settings columns  
SELECT 
    'COLUMN CHECK' as check_type,
    'company_settings columns' as category,
    CASE WHEN column_name = 'tenant_id' THEN '✅ tenant_id EXISTS' END as tenant_id,
    CASE WHEN column_name = 'industry' THEN '✅ industry EXISTS' END as industry,
    CASE WHEN column_name = 'annual_revenue' THEN '✅ annual_revenue EXISTS' END as annual_revenue,
    CASE WHEN column_name = 'employee_count' THEN '✅ employee_count EXISTS' END as employee_count,
    CASE WHEN column_name = 'founding_date' THEN '✅ founding_date EXISTS' END as founding_date,
    CASE WHEN column_name = 'business_description' THEN '✅ business_description EXISTS' END as business_description,
    CASE WHEN column_name = 'ein' THEN '✅ ein EXISTS' END as ein,
    CASE WHEN column_name = 'tax_id' THEN '✅ tax_id EXISTS' END as tax_id
FROM information_schema.columns 
WHERE table_name = 'company_settings' AND table_schema = 'public'
AND column_name IN ('tenant_id', 'industry', 'annual_revenue', 'employee_count', 'founding_date', 'business_description', 'ein', 'tax_id');

-- =====================================================
-- SECTION 5: Check Data Counts in Key Tables
-- =====================================================
SELECT 
    'DATA COUNT CHECK' as check_type,
    'Data Population' as category,
    COALESCE((SELECT COUNT(*) FROM user_profiles), 0) as user_profiles_count,
    COALESCE((SELECT COUNT(*) FROM company_settings), 0) as company_settings_count,
    COALESCE((SELECT COUNT(*) FROM opportunities), 0) as opportunities_count;

-- =====================================================
-- SECTION 6: Check RLS (Row Level Security) Policies
-- =====================================================
SELECT 
    'RLS POLICY CHECK' as check_type,
    tablename as table_name,
    CASE WHEN rowsecurity = true THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'company_settings', 'opportunities', 'ufa_analysis_results', 'ufa_strategic_goals')
ORDER BY tablename;

-- =====================================================
-- SECTION 7: Missing Tables Creation Suggestions
-- =====================================================
SELECT 
    'MISSING TABLES' as check_type,
    'Creation Required' as category,
    'If tables are missing, run the database migration scripts or create them manually' as instructions;

-- List all existing tables for reference
SELECT 
    'EXISTING TABLES' as check_type,
    'Current Schema' as category,
    STRING_AGG(table_name, ', ' ORDER BY table_name) as existing_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- =====================================================
-- SECTION 8: Check Authentication Tables
-- =====================================================
SELECT 
    'AUTH TABLES CHECK' as check_type,
    'Authentication System' as category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'auth') 
        THEN '✅ auth.users EXISTS (Supabase Auth)'
        ELSE '❌ auth.users MISSING - Check Supabase Auth setup'
    END as auth_users_status;

-- =====================================================
-- SECTION 9: Function and Trigger Check
-- =====================================================
SELECT 
    'FUNCTIONS CHECK' as check_type,
    'Database Functions' as category,
    COUNT(*) as custom_function_count,
    STRING_AGG(routine_name, ', ') as function_names
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- =====================================================
-- FINAL SUMMARY
-- =====================================================
SELECT 
    'VALIDATION SUMMARY' as check_type,
    'Database Health' as category,
    'Review all sections above for missing tables, columns, or data' as recommendation,
    'Critical tables: user_profiles, company_settings, opportunities must exist' as critical_note,
    'UFA and SBA tables can be created via migration scripts if missing' as migration_note;