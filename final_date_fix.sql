-- FINAL FIX: Clean DATE columns that somehow got empty strings
-- Since these are proper DATE columns, we need a different approach

-- The issue is likely in the application layer, but let's clean any bad data
-- We'll use a safer approach that handles the conversion properly

-- First, let's see what records exist (this should work since they're DATE columns)
SELECT 
    id, 
    name,
    proposed_start_date,
    funding_decision_needed, 
    latest_useful_start,
    investment_deadline
FROM projects 
WHERE proposed_start_date IS NOT NULL 
   OR funding_decision_needed IS NOT NULL 
   OR latest_useful_start IS NOT NULL 
   OR investment_deadline IS NOT NULL
LIMIT 5;

-- If there are any records with empty strings in DATE columns, 
-- they would have been rejected during insertion
-- So the issue is happening during INSERT, not with existing data

-- Let's just ensure our columns allow NULL (they already do based on is_nullable = YES)
-- and add a comment for clarity
COMMENT ON COLUMN projects.proposed_start_date IS 'Project proposed start date - NULL if not specified';
COMMENT ON COLUMN projects.funding_decision_needed IS 'Date by which funding decision is needed - NULL if flexible';
COMMENT ON COLUMN projects.latest_useful_start IS 'Latest date project can usefully start - NULL if flexible'; 
COMMENT ON COLUMN projects.investment_deadline IS 'Investment deadline - NULL if not specified';

-- Verify there are no constraint issues
SELECT 
    constraint_name,
    constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'projects' 
AND constraint_type = 'CHECK';