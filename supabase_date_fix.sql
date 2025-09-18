-- Quick fix for PostgreSQL date field error in Supabase
-- Run this in your Supabase SQL Editor

-- The issue is that PostgreSQL DATE columns can't contain empty strings
-- We need to check the actual column types and handle this differently

-- First, let's see what columns exist and their types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name LIKE '%date%' 
OR column_name LIKE '%deadline%' 
OR column_name LIKE '%start%' 
OR column_name LIKE '%end%';

-- Since we can't compare DATE columns to empty strings directly,
-- let's check if these are actually TEXT columns storing dates
-- and handle them appropriately

-- Clean TEXT columns that should contain dates
UPDATE projects SET proposed_start_date = NULL 
WHERE proposed_start_date IS NOT NULL 
AND CAST(proposed_start_date AS TEXT) = '';

UPDATE projects SET funding_decision_needed = NULL 
WHERE funding_decision_needed IS NOT NULL 
AND CAST(funding_decision_needed AS TEXT) = '';

UPDATE projects SET latest_useful_start = NULL 
WHERE latest_useful_start IS NOT NULL 
AND CAST(latest_useful_start AS TEXT) = '';

-- Alternative approach: Handle as TEXT first, then convert
-- This handles the case where the columns are TEXT but should be DATE
DO $$
BEGIN
    -- Try to update each potential date column
    PERFORM 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'proposed_start_date';
    
    IF FOUND THEN
        UPDATE projects SET proposed_start_date = NULL 
        WHERE (proposed_start_date IS NOT NULL AND LENGTH(TRIM(CAST(proposed_start_date AS TEXT))) = 0);
    END IF;
END $$;

-- Show any remaining problematic records
SELECT id, name, 
       proposed_start_date,
       funding_decision_needed,
       latest_useful_start,
       LENGTH(CAST(proposed_start_date AS TEXT)) as start_date_length,
       LENGTH(CAST(latest_useful_start AS TEXT)) as end_date_length
FROM projects 
WHERE CAST(proposed_start_date AS TEXT) = '' 
   OR CAST(latest_useful_start AS TEXT) = ''
   OR CAST(funding_decision_needed AS TEXT) = ''
LIMIT 10;