-- See ALL data in your current profile
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
    industry,
    business_stage,
    setup_completed,
    created_at,
    updated_at,
    -- Check if there's any data at all
    CASE 
        WHEN organization_name IS NOT NULL THEN 'HAS ORG NAME'
        WHEN city IS NOT NULL THEN 'HAS CITY'
        WHEN ein IS NOT NULL THEN 'HAS EIN'
        ELSE 'EMPTY PROFILE'
    END as data_status
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';
