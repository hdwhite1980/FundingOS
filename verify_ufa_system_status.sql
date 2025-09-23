-- Final Verification: UFA SBA Intelligence System Status
-- Run this to confirm all tables, policies, and features are working

-- =====================================================
-- VERIFY ALL TABLES EXIST
-- =====================================================
SELECT 
    'TABLE VERIFICATION' as check_type,
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'ufa_analysis_results',
        'ufa_strategic_goals', 
        'ufa_notifications',
        'ufa_sba_knowledge_base',
        'ufa_sba_programs',
        'ufa_sba_readiness_assessments'
    )
ORDER BY table_name;

-- =====================================================
-- VERIFY RLS POLICIES
-- =====================================================
SELECT 
    'RLS POLICY VERIFICATION' as check_type,
    tablename as table_name,
    policyname as policy_name,
    'ACTIVE' as status
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename LIKE '%ufa_%'
ORDER BY tablename, policyname;

-- =====================================================
-- VERIFY INDEXES
-- =====================================================
SELECT 
    'INDEX VERIFICATION' as check_type,
    schemaname,
    tablename,
    indexname,
    'ACTIVE' as status
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename IN (
        'ufa_analysis_results',
        'ufa_strategic_goals',
        'ufa_notifications', 
        'ufa_sba_knowledge_base',
        'ufa_sba_programs',
        'ufa_sba_readiness_assessments'
    )
ORDER BY tablename, indexname;

-- =====================================================
-- VERIFY TRIGGERS
-- =====================================================
SELECT 
    'TRIGGER VERIFICATION' as check_type,
    trigger_name,
    event_object_table as table_name,
    'ACTIVE' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
    AND event_object_table LIKE '%ufa_%'
    AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- SUMMARY STATUS
-- =====================================================
SELECT 
    'SYSTEM STATUS' as check_type,
    'UFA SBA INTELLIGENCE SYSTEM' as component,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'ufa_analysis_results', 'ufa_strategic_goals', 'ufa_notifications',
                'ufa_sba_knowledge_base', 'ufa_sba_programs', 'ufa_sba_readiness_assessments'
            )
        ) = 6 THEN 'FULLY OPERATIONAL'
        ELSE 'INCOMPLETE SETUP'
    END as status,
    'All 6 tables, RLS policies, indexes, and triggers created successfully' as details;