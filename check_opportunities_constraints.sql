-- Check current opportunities table structure and constraints
-- Run this to see what columns have NOT NULL constraints

SELECT 
  'opportunities table constraints' as info,
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE WHEN is_nullable = 'NO' THEN '⚠️ REQUIRED' ELSE '✅ Optional' END as constraint_status
FROM information_schema.columns 
WHERE table_name = 'opportunities'
ORDER BY 
  CASE WHEN is_nullable = 'NO' THEN 1 ELSE 2 END,
  column_name;

-- Check if there are any existing opportunities to see what sponsor values look like
SELECT 
  'sample opportunities data' as info,
  id,
  title,
  sponsor,
  organization,
  created_at
FROM opportunities 
ORDER BY created_at DESC 
LIMIT 5;