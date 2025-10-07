-- Check for multiple profile records for this user
SELECT 
    id,
    user_id,
    email,
    organization_name,
    setup_completed,
    created_at,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY created_at DESC;

-- Check if there's a profiles table (legacy) that might be interfering
SELECT 
    id,
    user_id,
    email,
    setup_completed,
    created_at,
    updated_at
FROM public.profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY created_at DESC;
