-- Check if unique constraint exists on user_id
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
  AND conname LIKE '%user_id%';

-- Check all constraints on user_profiles
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
ORDER BY contype, conname;

-- Check indexes on user_id
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_profiles'
  AND indexdef LIKE '%user_id%';
