-- DEFINITIVE FIX FOR OPPORTUNITY_ID FOREIGN KEY CONSTRAINT ERROR
-- This script resolves the conflict between database_updates.sql and complete_submissions_schema_fix.sql
-- Run this in Supabase SQL Editor

-- =====================================================================
-- DIAGNOSTIC: Check current submissions table structure
-- =====================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'CURRENT SUBMISSIONS TABLE OPPORTUNITY_ID STATUS:';
    RAISE NOTICE '================================================================';
    
    -- Check if opportunity_id column exists and its type
    SELECT data_type, is_nullable INTO rec
    FROM information_schema.columns 
    WHERE table_name = 'submissions' AND column_name = 'opportunity_id';
    
    IF FOUND THEN
        RAISE NOTICE 'opportunity_id column exists - Type: %, Nullable: %', rec.data_type, rec.is_nullable;
    ELSE
        RAISE NOTICE 'opportunity_id column does NOT exist';
    END IF;
    
    -- Check if foreign key constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'submissions' 
        AND kcu.column_name = 'opportunity_id' 
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE 'Foreign key constraint EXISTS on opportunity_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint does NOT exist on opportunity_id';
    END IF;
    
    RAISE NOTICE '================================================================';
END $$;

-- =====================================================================
-- FIX: Ensure opportunity_id is TEXT without foreign key constraint
-- =====================================================================

-- Step 1: Remove foreign key constraint if it exists
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_opportunity_id_fkey;
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS fk_submissions_opportunity_id;

-- Step 2: Drop and recreate opportunity_id column as TEXT
ALTER TABLE submissions DROP COLUMN IF EXISTS opportunity_id;
ALTER TABLE submissions ADD COLUMN opportunity_id TEXT;

-- Step 3: Create index for performance (without foreign key constraint)
CREATE INDEX IF NOT EXISTS idx_submissions_opportunity_id ON submissions(opportunity_id);

-- =====================================================================
-- VERIFICATION: Check the fix
-- =====================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'VERIFICATION - AFTER FIX:';
    RAISE NOTICE '================================================================';
    
    -- Check column type
    SELECT data_type, is_nullable INTO rec
    FROM information_schema.columns 
    WHERE table_name = 'submissions' AND column_name = 'opportunity_id';
    
    IF FOUND THEN
        RAISE NOTICE 'opportunity_id column type: % (should be "text")', rec.data_type;
    ELSE
        RAISE NOTICE 'ERROR: opportunity_id column still does not exist!';
    END IF;
    
    -- Check foreign key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'submissions' 
        AND kcu.column_name = 'opportunity_id' 
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE NOTICE 'WARNING: Foreign key constraint still exists!';
    ELSE
        RAISE NOTICE 'SUCCESS: No foreign key constraint on opportunity_id';
    END IF;
    
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'FIX COMPLETED!';
    RAISE NOTICE 'The submissions table now has:';
    RAISE NOTICE '- opportunity_id as TEXT (not UUID)';
    RAISE NOTICE '- No foreign key constraint (allows "ai-generated-xxx" IDs)';
    RAISE NOTICE '- Performance index on opportunity_id';
    RAISE NOTICE '================================================================';
END $$;