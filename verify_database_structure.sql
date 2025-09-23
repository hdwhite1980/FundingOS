-- Simple verification script to check what exists in your database
-- Run this to troubleshoot the "column does not exist" errors

-- Check which UFA tables exist
SELECT 
    'UFA TABLES STATUS' as check_type,
    STRING_AGG(table_name, ', ') as existing_ufa_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%ufa%';

-- Check columns in ufa_sba_programs table (if it exists)
SELECT 
    'UFA_SBA_PROGRAMS COLUMNS' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_sba_programs' AND table_schema = 'public')
        THEN (
            SELECT STRING_AGG(column_name, ', ' ORDER BY ordinal_position)
            FROM information_schema.columns 
            WHERE table_name = 'ufa_sba_programs' AND table_schema = 'public'
        )
        ELSE 'TABLE DOES NOT EXIST'
    END as columns_list;

-- Check if specific problematic columns exist
SELECT 
    'COLUMN EXISTENCE CHECK' as check_type,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ufa_sba_programs' AND column_name = 'active' AND table_schema = 'public') THEN 'EXISTS' ELSE 'MISSING' END) as active_column,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ufa_sba_programs' AND column_name = 'industry_codes' AND table_schema = 'public') THEN 'EXISTS' ELSE 'MISSING' END) as industry_codes_column,
    (CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ufa_sba_knowledge_base' AND column_name = 'keywords' AND table_schema = 'public') THEN 'EXISTS' ELSE 'MISSING' END) as keywords_column;

-- List all public tables for reference
SELECT 
    'ALL PUBLIC TABLES' as check_type,
    COUNT(*) as total_tables,
    STRING_AGG(table_name, ', ' ORDER BY table_name) as all_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- Final diagnosis
SELECT 
    'DIAGNOSIS' as check_type,
    'Check the results above to see what tables and columns actually exist' as instruction,
    'If tables are missing, run create_missing_ufa_tables.sql first' as step_1,
    'If columns are missing, there may be an issue with table creation' as step_2;