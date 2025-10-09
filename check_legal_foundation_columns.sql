-- Check if Legal Foundation columns exist in user_profiles table
-- Run this in Supabase SQL Editor

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
  AND column_name IN (
    'tax_id',
    'date_incorporated', 
    'state_incorporated',
    'sam_gov_status',
    'grants_gov_status',
    'duns_uei_number',
    'compliance_history'
  )
ORDER BY column_name;

-- If any of these columns are missing, they need to be added:

-- Uncomment and run these if columns are missing:

/*
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS date_incorporated DATE,
  ADD COLUMN IF NOT EXISTS state_incorporated VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sam_gov_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS grants_gov_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS duns_uei_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS compliance_history VARCHAR(100);
*/

-- After adding columns, verify again:
/*
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
  AND column_name IN (
    'tax_id',
    'date_incorporated', 
    'state_incorporated',
    'sam_gov_status',
    'grants_gov_status',
    'duns_uei_number',
    'compliance_history'
  )
ORDER BY column_name;
*/
