-- Change largest_grant from numeric to text to support categorical values
ALTER TABLE public.user_profiles 
ALTER COLUMN largest_grant TYPE text;

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name = 'largest_grant';
