-- Inspect current data types and values to understand the malformed array issue
-- Run this to see what's in your database before migration

-- First, check if the opportunities table exists and get basic info
SELECT 
  'opportunities table info' as info,
  COUNT(*) as total_rows
FROM opportunities;

-- Check column information
SELECT 
  'opportunities table columns' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
AND column_name IN ('project_types', 'eligibility_criteria')
ORDER BY column_name;

-- Check project_types values (cast to text to avoid array comparison issues)
SELECT 
  'project_types distinct values' as info,
  project_types::text as project_types_as_text,
  CASE 
    WHEN project_types IS NULL THEN NULL
    WHEN pg_typeof(project_types) = 'text'::regtype THEN length(project_types::text)
    WHEN pg_typeof(project_types) = 'text[]'::regtype THEN array_length(project_types, 1)
    ELSE NULL
  END as length_or_array_length,
  pg_typeof(project_types) as data_type,
  COUNT(*) as count
FROM opportunities 
WHERE project_types IS NOT NULL
GROUP BY project_types::text, project_types, pg_typeof(project_types)
ORDER BY count DESC
LIMIT 20;

-- Check eligibility_criteria data type and sample values (cast to text to avoid array issues)
SELECT 
  'eligibility_criteria sample' as info,
  eligibility_criteria::text as eligibility_criteria_as_text,
  pg_typeof(eligibility_criteria) as data_type,
  COUNT(*) as count
FROM opportunities 
WHERE eligibility_criteria IS NOT NULL
GROUP BY eligibility_criteria::text, eligibility_criteria, pg_typeof(eligibility_criteria)
ORDER BY count DESC
LIMIT 10;

-- Check for empty or problematic values
SELECT 
  'problematic values count' as info,
  SUM(CASE 
    WHEN project_types IS NOT NULL AND project_types::text = '' THEN 1 
    ELSE 0 
  END) as empty_string_project_types,
  SUM(CASE 
    WHEN project_types IS NOT NULL AND project_types::text = '""' THEN 1 
    ELSE 0 
  END) as double_quote_project_types,
  SUM(CASE 
    WHEN project_types IS NOT NULL AND project_types::text = '{}' THEN 1 
    ELSE 0 
  END) as empty_array_project_types,
  SUM(CASE WHEN project_types IS NULL THEN 1 ELSE 0 END) as null_project_types,
  SUM(CASE WHEN eligibility_criteria IS NULL THEN 1 ELSE 0 END) as null_eligibility_criteria,
  COUNT(*) as total_opportunities
FROM opportunities;

-- Check any existing indexes on these columns
SELECT 
  'existing indexes' as info,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'opportunities' 
AND (indexdef LIKE '%project_types%' OR indexdef LIKE '%eligibility_criteria%');