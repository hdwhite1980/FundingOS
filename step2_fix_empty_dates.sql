-- STEP 2: Simple fix - just clean the specific problematic records
-- Run this after Step 1 to fix the empty string issue

-- For TEXT columns that contain empty strings, set them to NULL
UPDATE projects 
SET proposed_start_date = CASE 
    WHEN proposed_start_date = '' THEN NULL 
    ELSE proposed_start_date 
END;

UPDATE projects 
SET latest_useful_start = CASE 
    WHEN latest_useful_start = '' THEN NULL 
    ELSE latest_useful_start 
END;

UPDATE projects 
SET funding_decision_needed = CASE 
    WHEN funding_decision_needed = '' THEN NULL 
    ELSE funding_decision_needed 
END;

-- Check if fix worked
SELECT COUNT(*) as empty_date_records
FROM projects 
WHERE proposed_start_date = '' 
   OR latest_useful_start = '' 
   OR funding_decision_needed = '';

-- Should show 0 if fixed