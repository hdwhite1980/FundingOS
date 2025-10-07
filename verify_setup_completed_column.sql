-- Check if setup_completed column exists in user_profiles table
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check the actual profile data
SELECT 
    user_id,
    email,
    organization_name,
    created_at,
    updated_at,
    -- Try to select setup_completed (this will fail if column doesn't exist)
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'setup_completed'
        ) THEN 'Column exists'
        ELSE 'Column missing'
    END as setup_completed_status
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
   OR email = 'hdwhite@ahts4me.com';
