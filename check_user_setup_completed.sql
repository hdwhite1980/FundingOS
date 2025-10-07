-- Check setup_completed status for user hdwhite@ahts4me.com

SELECT 
    user_id,
    email,
    setup_completed,
    organization_name,
    created_at,
    updated_at
FROM public.user_profiles
WHERE email = 'hdwhite@ahts4me.com'
   OR user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';

-- Also check if the column exists and its default value
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name = 'setup_completed';
