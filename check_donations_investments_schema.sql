-- Check donations table schema
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'donations'
ORDER BY ordinal_position;

-- Check investments table schema
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'investments'
ORDER BY ordinal_position;
