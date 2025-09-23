-- Clean up existing UFA tables and start fresh
-- Run this script to remove any partially created UFA tables

-- =====================================================
-- DROP EXISTING UFA TABLES AND POLICIES
-- =====================================================

-- Drop tables in reverse dependency order to avoid foreign key conflicts
DROP TABLE IF EXISTS ufa_sba_readiness_assessments CASCADE;
DROP TABLE IF EXISTS ufa_sba_programs CASCADE;
DROP TABLE IF EXISTS ufa_sba_knowledge_base CASCADE;
DROP TABLE IF EXISTS ufa_notifications CASCADE;
DROP TABLE IF EXISTS ufa_strategic_goals CASCADE;
DROP TABLE IF EXISTS ufa_analysis_results CASCADE;

-- Drop any existing functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Verify cleanup
SELECT 
    'CLEANUP COMPLETE' as status,
    'All UFA tables, policies, and functions have been removed' as message,
    'You can now run create_missing_ufa_tables.sql safely' as next_step,
    (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%ufa%'
    ) as remaining_ufa_tables;

-- Show remaining tables for reference
SELECT 
    'REMAINING TABLES' as info_type,
    STRING_AGG(table_name, ', ' ORDER BY table_name) as table_list
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';