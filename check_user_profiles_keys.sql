-- Check the user_profiles table structure
-- Run this in Supabase SQL Editor

-- Check what columns exist and their relationships
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
  AND column_name IN ('id', 'user_id')
ORDER BY ordinal_position;

-- Check if there's a unique constraint on user_id
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'user_profiles'
  AND kcu.column_name IN ('id', 'user_id');
