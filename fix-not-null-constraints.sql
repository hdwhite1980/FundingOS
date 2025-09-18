-- Fix NOT NULL constraints causing project creation failures
-- Run this in Supabase SQL Editor

BEGIN;

-- Remove NOT NULL constraints that are causing issues
ALTER TABLE projects ALTER COLUMN funding_needed DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN funding_needed SET DEFAULT NULL;

-- Check for other problematic NOT NULL constraints
DO $$
DECLARE
    col_record RECORD;
BEGIN
    -- Find all NOT NULL columns in projects table that might be causing issues
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND is_nullable = 'NO'
        AND column_name NOT IN ('id', 'created_at', 'updated_at')  -- Keep essential NOT NULLs
    LOOP
        RAISE NOTICE 'Found NOT NULL column: % (type: %, default: %)', 
            col_record.column_name, col_record.data_type, col_record.column_default;
            
        -- Remove NOT NULL from common optional fields
        IF col_record.column_name IN (
            'funding_needed', 'timeline', 'industry', 'target_population',
            'expected_jobs_created', 'environmental_impact', 'name', 
            'description', 'location', 'project_type'
        ) THEN
            EXECUTE format('ALTER TABLE projects ALTER COLUMN %I DROP NOT NULL', col_record.column_name);
            RAISE NOTICE 'Removed NOT NULL constraint from %', col_record.column_name;
        END IF;
    END LOOP;
END $$;

-- Set reasonable defaults for commonly used fields
ALTER TABLE projects ALTER COLUMN name SET DEFAULT '';
ALTER TABLE projects ALTER COLUMN description SET DEFAULT '';
ALTER TABLE projects ALTER COLUMN location SET DEFAULT 'Unspecified';
ALTER TABLE projects ALTER COLUMN project_type SET DEFAULT 'other';

COMMIT;

-- Test message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed NOT NULL constraints on projects table';
  RAISE NOTICE '   funding_needed and other optional fields can now be NULL';
  RAISE NOTICE '   Try creating a project again';
END $$;