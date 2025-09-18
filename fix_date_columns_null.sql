-- Fix date columns to allow NULL and clean existing empty strings
-- This addresses PostgreSQL error: invalid input syntax for type date: ""

-- First, let's see what date columns exist in the projects table
DO $$
DECLARE
    col_name TEXT;
    sql_cmd TEXT;
BEGIN
    -- Update any empty string values to NULL in date columns
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND data_type = 'date'
    LOOP
        sql_cmd := format('UPDATE projects SET %I = NULL WHERE %I = %L', col_name, col_name, '');
        EXECUTE sql_cmd;
        RAISE NOTICE 'Cleaned empty strings in column: %', col_name;
    END LOOP;
END $$;

-- Specifically handle known date columns that might have empty strings
UPDATE projects SET proposed_start_date = NULL WHERE proposed_start_date IS NULL OR CAST(proposed_start_date AS TEXT) = '';
UPDATE projects SET funding_decision_needed = NULL WHERE funding_decision_needed IS NULL OR CAST(funding_decision_needed AS TEXT) = '';
UPDATE projects SET latest_useful_start = NULL WHERE latest_useful_start IS NULL OR CAST(latest_useful_start AS TEXT) = '';
UPDATE projects SET investment_deadline = NULL WHERE investment_deadline IS NULL OR CAST(investment_deadline AS TEXT) = '';

-- Ensure all date columns allow NULL (they should by default, but let's be sure)
ALTER TABLE projects ALTER COLUMN proposed_start_date DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN funding_decision_needed DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN latest_useful_start DROP NOT NULL;
ALTER TABLE projects ALTER COLUMN investment_deadline DROP NOT NULL;

-- Add a check constraint to prevent empty strings in date columns in the future
-- (This is optional - the API should handle this, but it's a safety net)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_no_empty_date_strings;
    
    -- Add constraint to ensure date fields are either NULL or valid dates (not empty strings)
    ALTER TABLE projects ADD CONSTRAINT check_no_empty_date_strings 
    CHECK (
        (proposed_start_date IS NULL OR CAST(proposed_start_date AS TEXT) != '') AND
        (funding_decision_needed IS NULL OR CAST(funding_decision_needed AS TEXT) != '') AND
        (latest_useful_start IS NULL OR CAST(latest_useful_start AS TEXT) != '') AND
        (investment_deadline IS NULL OR CAST(investment_deadline AS TEXT) != '')
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add check constraint (columns may not exist): %', SQLERRM;
END $$;

-- Clean up any other potential date fields that might exist
DO $$
DECLARE
    col_name TEXT;
    sql_cmd TEXT;
    row_count INTEGER;
BEGIN
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND (column_name LIKE '%date%' OR column_name LIKE '%deadline%' OR column_name LIKE '%_at')
        AND data_type IN ('date', 'timestamp without time zone', 'timestamp with time zone')
    LOOP
        -- Convert empty strings to NULL
        sql_cmd := format('UPDATE projects SET %I = NULL WHERE CAST(%I AS TEXT) = %L', col_name, col_name, '');
        EXECUTE sql_cmd;
        GET DIAGNOSTICS row_count = ROW_COUNT;
        IF row_count > 0 THEN
            RAISE NOTICE 'Cleaned % empty strings in date column: %', row_count, col_name;
        END IF;
    END LOOP;
END $$;

RAISE NOTICE '✅ Date column cleanup complete!';