-- Quick diagnostic: Show which Account Settings fields are MISSING from user_profiles
-- This will only list the fields that DON'T exist in the database

WITH expected_fields AS (
  SELECT unnest(ARRAY[
    -- Profile fields
    'full_name', 'user_role',
    -- Legal Foundation fields
    'tax_id', 'date_incorporated', 'state_incorporated', 'duns_uei_number', 
    'sam_gov_status', 'grants_gov_status', 'compliance_history',
    -- Organization fields
    'organization_name', 'organization_type', 'audit_status', 
    'financial_systems', 'indirect_cost_rate',
    -- Address fields
    'address_line1', 'address_line2', 'city', 'state', 'zip_code', 
    'phone', 'website', 'service_radius',
    -- Capacity fields
    'annual_budget', 'years_in_operation', 'full_time_staff', 'board_size',
    'grant_experience', 'largest_grant', 'grant_writing_capacity',
    'data_collection_capacity', 'partnership_approach',
    -- Mission fields
    'mission_statement', 'primary_service_areas', 'target_demographics',
    'key_outcomes', 'unique_differentiators',
    -- Certification fields
    'minority_owned', 'woman_owned', 'veteran_owned', 'small_business',
    'hubzone_certified', 'eight_a_certified', 'disadvantaged_business'
  ]) AS field_name
),
existing_columns AS (
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
)
SELECT 
  '❌ MISSING: ' || ef.field_name as missing_column
FROM expected_fields ef
WHERE NOT EXISTS (
  SELECT 1 
  FROM existing_columns ec 
  WHERE ec.column_name = ef.field_name
)
ORDER BY ef.field_name;

-- If no rows are returned, ALL fields exist in the database!
