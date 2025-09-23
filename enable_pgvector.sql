-- Enable pgvector extension in Supabase
-- Run this FIRST before creating the UFA tables

-- =====================================================
-- ENABLE PGVECTOR EXTENSION
-- =====================================================
-- This enables vector data types and similarity functions
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension is enabled
SELECT 
    'PGVECTOR STATUS' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) THEN '✅ pgvector extension is enabled'
        ELSE '❌ pgvector extension failed to enable'
    END as extension_status;

-- Show available vector operators and functions
SELECT 
    'VECTOR CAPABILITIES' as info_type,
    'pgvector provides: <->, <#>, <=> operators for similarity search' as operators,
    'Functions: cosine_distance, inner_product, l2_distance' as functions,
    'Data types: vector(dimensions)' as data_types;

-- Test vector functionality (optional)
-- This creates a temporary vector to verify the extension works
DO $$
BEGIN
    -- Test basic vector operations
    PERFORM '[1,2,3]'::vector(3) <-> '[4,5,6]'::vector(3);
    RAISE NOTICE 'pgvector is working correctly - vector operations successful';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'pgvector test failed: %', SQLERRM;
END $$;

-- Ready message
SELECT 
    'READY FOR TABLE CREATION' as status,
    'pgvector is now enabled - you can run create_missing_ufa_tables.sql' as next_step;