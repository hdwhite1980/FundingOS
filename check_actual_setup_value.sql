-- Check the actual setup_completed value
SELECT 
    user_id,
    email,
    organization_name,
    setup_completed,
    created_at,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';
