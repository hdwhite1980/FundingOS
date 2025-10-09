-- Check current state of all important fields
SELECT 
    user_id,
    email,
    organization_name,
    -- Address fields
    address_line1,
    city,
    state,
    zip_code,
    phone,
    website,
    service_radius,
    -- Capacity fields
    years_in_operation,
    full_time_staff,
    board_size,
    annual_budget,
    -- Grant experience fields
    grant_experience,
    largest_grant,
    grant_writing_capacity,
    data_collection_capacity,
    -- Financial
    audit_status,
    financial_systems,
    -- Mission
    mission_statement,
    -- Certifications
    minority_owned,
    woman_owned,
    veteran_owned,
    small_business,
    eight_a_certified,
    hubzone_certified,
    disadvantaged_business,
    -- Timestamps
    created_at,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';
