-- Database Schema Analysis Queries
-- Run these in your Supabase SQL Editor to get detailed schema information

-- 1. CHECK RLS POLICIES ON ALL TABLES
-- This shows which tables have RLS enabled and what policies exist
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) 
     FROM pg_policies p 
     WHERE p.schemaname = t.schemaname 
     AND p.tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- Get detailed RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. CHECK FOREIGN KEY CONSTRAINTS
-- This shows all foreign key relationships
SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 3. CHECK EXISTING INDEXES
-- This shows all indexes on public schema tables
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. CHECK DATA TYPES FOR ID COLUMNS
-- This specifically looks at ID column types across tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name LIKE '%id%'
  AND table_name NOT LIKE 'pg_%'
ORDER BY table_name, column_name;

-- 5. CHECK FOR update_updated_at TRIGGER FUNCTION
-- See if the trigger function exists globally
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%update%updated_at%';

-- Check which tables have update_updated_at triggers
SELECT
    event_object_table as table_name,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;

-- 6. CHECK SPECIFIC TABLE RELATIONSHIPS
-- Focus on the key relationships mentioned
SELECT 
    'project_opportunities -> projects' as relationship,
    count(*) as records_with_project_id
FROM project_opportunities 
WHERE project_id IS NOT NULL

UNION ALL

SELECT 
    'project_opportunities -> opportunities' as relationship,
    count(*) as records_with_opportunity_id
FROM project_opportunities 
WHERE opportunity_id IS NOT NULL

UNION ALL

SELECT 
    'angel_investments -> angel_investors(id)' as relationship,
    count(*) as records
FROM angel_investments ai
WHERE EXISTS (
    SELECT 1 FROM angel_investors ang 
    WHERE ang.id = ai.investor_id
)

UNION ALL

SELECT 
    'angel_investments -> angel_investors(user_id)' as relationship,
    count(*) as records
FROM angel_investments ai
WHERE EXISTS (
    SELECT 1 FROM angel_investors ang 
    WHERE ang.user_id = ai.investor_id
);

-- 7. CHECK TABLE SIZES AND RECORD COUNTS
-- Get an overview of your data volume
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_stat_get_tuples_returned(c.oid) as approx_row_count
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 8. CHECK FOR MISSING INDEXES ON FREQUENTLY QUERIED COLUMNS
-- These are columns that should probably have indexes based on your code
SELECT 
    'opportunities' as table_name,
    'source, last_updated' as suggested_index,
    'For sync operations' as reason
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'opportunities' 
    AND indexdef LIKE '%source%' 
    AND indexdef LIKE '%last_updated%'
)

UNION ALL

SELECT 
    'agent_conversations' as table_name,
    'user_id, created_at' as suggested_index,
    'For chat history queries' as reason
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'agent_conversations' 
    AND indexdef LIKE '%user_id%' 
    AND indexdef LIKE '%created_at%'
)

UNION ALL

SELECT 
    'project_opportunities' as table_name,
    'project_id, opportunity_id' as suggested_index,
    'For matching queries' as reason
WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'project_opportunities' 
    AND indexdef LIKE '%project_id%'
);

-- 9. VERIFY SPECIFIC SCHEMA EXPECTATIONS
-- Check if opportunities.id is text and most others are uuid
SELECT 
    'opportunities.id data type' as check_name,
    data_type as current_value,
    CASE WHEN data_type = 'text' THEN '✅ Expected' ELSE '❌ Unexpected' END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'opportunities' 
  AND column_name = 'id'

UNION ALL

SELECT 
    'projects.id data type' as check_name,
    data_type as current_value,
    CASE WHEN data_type = 'uuid' THEN '✅ Expected' ELSE '❌ Unexpected' END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'projects' 
  AND column_name = 'id';

-- 10. CHECK user_profiles TABLE STATUS
-- See if the table exists and what columns it has
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    ) THEN 'user_profiles table EXISTS' 
    ELSE 'user_profiles table MISSING' 
    END as table_status;

-- If table exists, show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;