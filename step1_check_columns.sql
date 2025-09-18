-- STEP 1: Check column types first
-- Run this first to understand what we're dealing with

SELECT 
    column_name, 
    data_type,
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND (
    column_name LIKE '%date%' 
    OR column_name LIKE '%deadline%' 
    OR column_name IN ('proposed_start_date', 'funding_decision_needed', 'latest_useful_start')
)
ORDER BY column_name;