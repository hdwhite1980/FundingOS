-- Check ALL profile data for user to see what's actually saved
SELECT *
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';

-- Check column structure to see what fields exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;
