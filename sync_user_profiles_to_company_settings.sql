-- Copy organization data from user_profiles to company_settings
-- This syncs the two tables so UFA can find your organization data

INSERT INTO public.company_settings (
    user_id,
    organization_name,
    ein,
    tax_id,
    duns_number,
    cage_code,
    organization_type,
    address_line1,
    address_line2,
    city,
    state,
    zip_code,
    country,
    phone,
    website,
    created_at,
    updated_at
)
SELECT 
    user_id,
    organization_name,
    ein,
    tax_id,
    duns_number,
    cage_code,
    organization_type,
    address_line1,
    address_line2,
    city,
    state,
    zip_code,
    COALESCE(country, 'United States') as country,
    phone,
    website,
    created_at,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ON CONFLICT (user_id) 
DO UPDATE SET
    organization_name = EXCLUDED.organization_name,
    ein = EXCLUDED.ein,
    tax_id = EXCLUDED.tax_id,
    duns_number = EXCLUDED.duns_number,
    cage_code = EXCLUDED.cage_code,
    organization_type = EXCLUDED.organization_type,
    address_line1 = EXCLUDED.address_line1,
    address_line2 = EXCLUDED.address_line2,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip_code = EXCLUDED.zip_code,
    country = EXCLUDED.country,
    phone = EXCLUDED.phone,
    website = EXCLUDED.website,
    updated_at = EXCLUDED.updated_at;

-- Verify the data was copied
SELECT 
    user_id,
    organization_name,
    ein,
    tax_id,
    city,
    state,
    organization_type
FROM public.company_settings
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';
