-- Check ALL records in user_profiles to see if data is being saved to wrong record
SELECT 
    id,
    user_id,
    email,
    organization_name,
    organization_type,
    city,
    state,
    ein,
    setup_completed,
    created_at,
    updated_at
FROM public.user_profiles
ORDER BY updated_at DESC
LIMIT 10;

-- Check specifically for your user_id
SELECT 
    id,
    user_id,
    email,
    organization_name,
    organization_type,
    city,
    state,
    ein,
    tax_id,
    setup_completed,
    created_at,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
   OR email = 'hdwhite@ahts4me.com';

-- Check if there are duplicate records with different ids
SELECT 
    COUNT(*) as record_count,
    user_id,
    email
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
GROUP BY user_id, email;
