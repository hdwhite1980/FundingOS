-- Safe inspection script that avoids array comparison issues
-- This version uses string operations to inspect array data safely

-- First, check basic table info
SELECT 
  'opportunities table info' as info,
  COUNT(*) as total_rows
FROM opportunities;

-- Check column information from schema
SELECT 
  'column information' as info,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
AND column_name IN ('project_types', 'eligibility_criteria')
ORDER BY column_name;

-- Safe way to check project_types values using string representation
WITH project_types_analysis AS (
  SELECT 
    project_types,
    project_types::text as text_representation,
    pg_typeof(project_types)::text as data_type,
    CASE 
      WHEN project_types IS NULL THEN 'null_value'
      WHEN length(project_types::text) = 0 THEN 'empty_string'
      WHEN project_types::text = '{}' THEN 'empty_array'
      WHEN project_types::text = '""' THEN 'double_quotes'
      WHEN project_types::text LIKE '{%}' THEN 'postgres_array_format'
      WHEN project_types::text LIKE '[%]' THEN 'json_array_format'
      ELSE 'other_format'
    END as value_category
  FROM opportunities
)
SELECT 
  'project_types analysis' as info,
  data_type,
  value_category,
  text_representation,
  COUNT(*) as count
FROM project_types_analysis
GROUP BY data_type, value_category, text_representation
ORDER BY count DESC
LIMIT 15;

-- Safe way to check eligibility_criteria 
WITH eligibility_analysis AS (
  SELECT 
    eligibility_criteria,
    eligibility_criteria::text as text_representation,
    pg_typeof(eligibility_criteria)::text as data_type,
    CASE 
      WHEN eligibility_criteria IS NULL THEN 'null_value'
      WHEN length(eligibility_criteria::text) = 0 THEN 'empty_string'
      WHEN eligibility_criteria::text = '{}' THEN 'empty_array'
      WHEN eligibility_criteria::text LIKE '{%}' THEN 'postgres_array_format'
      ELSE 'other_format'
    END as value_category
  FROM opportunities
)
SELECT 
  'eligibility_criteria analysis' as info,
  data_type,
  value_category,
  LEFT(text_representation, 100) as sample_text,
  COUNT(*) as count
FROM eligibility_analysis
GROUP BY data_type, value_category, LEFT(text_representation, 100)
ORDER BY count DESC
LIMIT 10;

-- Check existing indexes safely
SELECT 
  'existing indexes' as info,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'opportunities' 
AND (indexdef LIKE '%project_types%' OR indexdef LIKE '%eligibility_criteria%');

-- Summary of issues found
SELECT 
  'summary of issues' as info,
  COUNT(CASE WHEN project_types::text = '{}' THEN 1 END) as empty_array_project_types,
  COUNT(CASE WHEN project_types::text = '""' THEN 1 END) as double_quote_project_types,
  COUNT(CASE WHEN project_types::text = '' THEN 1 END) as empty_string_project_types,
  COUNT(CASE WHEN project_types IS NULL THEN 1 END) as null_project_types,
  COUNT(CASE WHEN eligibility_criteria IS NULL THEN 1 END) as null_eligibility_criteria,
  COUNT(*) as total_opportunities
FROM opportunities;