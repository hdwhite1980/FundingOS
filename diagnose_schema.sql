-- Diagnostic script to check current opportunities table schema
-- Run this in Supabase SQL Editor to see the current data types

SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
AND column_name IN (
  'eligibility_criteria',
  'project_types', 
  'ai_analysis',
  'estimated_funding',
  'fit_score',
  'status',
  'competitive_analysis',
  'matching_projects'
)
ORDER BY column_name;

-- Also check if any existing data would cause issues
SELECT 
  id,
  title,
  eligibility_criteria,
  project_types
FROM opportunities 
WHERE eligibility_criteria IS NOT NULL 
   OR project_types IS NOT NULL
LIMIT 3;