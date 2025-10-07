-- Check detailed profile information for user
SELECT 
    user_id,
    email,
    organization_name,
    organization_type,
    industry,
    city,
    state,
    ein,
    tax_id,
    annual_revenue,
    employee_count,
    years_in_operation,
    business_stage,
    minority_owned,
    woman_owned,
    veteran_owned,
    small_business,
    setup_completed,
    created_at,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';
