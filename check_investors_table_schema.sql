-- Check current investors table schema
-- Run this in Supabase SQL Editor to see what columns exist

-- 1. Check if the investors table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'investors'
) AS table_exists;

-- 2. Show all columns in the investors table
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'investors'
ORDER BY ordinal_position;

-- 3. Show all constraints on the investors table
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'investors';

-- 4. Show sample data (if any exists)
SELECT COUNT(*) as total_rows FROM public.investors;

-- 5. Show first 5 rows (if any)
SELECT * FROM public.investors LIMIT 5;

-- 6. Check for indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'investors';
