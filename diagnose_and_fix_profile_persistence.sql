-- Comprehensive diagnosis and fix for profile persistence issues
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: DIAGNOSE CURRENT STATE
-- ============================================

-- Check your current profile data
SELECT 
    'USER PROFILES' as table_name,
    id,
    user_id,
    full_name,
    organization_name,
    ein,
    tax_id,
    setup_completed,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY updated_at DESC;

-- Check company_settings data
SELECT 
    'COMPANY SETTINGS' as table_name,
    id,
    user_id,
    organization_name,
    ein,
    tax_id,
    created_at,
    updated_at
FROM public.company_settings
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY created_at DESC;

-- Check for duplicate rows in company_settings (shouldn't exist)
SELECT 
    user_id,
    COUNT(*) as row_count,
    array_agg(id ORDER BY created_at) as ids,
    array_agg(created_at ORDER BY created_at) as created_dates
FROM public.company_settings
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Check constraints on company_settings
SELECT 
    'COMPANY_SETTINGS CONSTRAINTS' as info,
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.company_settings'::regclass
ORDER BY contype, conname;

-- ============================================
-- PART 2: FIX MISSING CONSTRAINT
-- ============================================

-- Add unique constraint on company_settings.user_id
DO $$ 
BEGIN
    -- First, remove any duplicate rows (keep the most recent)
    DELETE FROM public.company_settings
    WHERE id NOT IN (
        SELECT DISTINCT ON (user_id) id
        FROM public.company_settings
        ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC
    );
    
    RAISE NOTICE '✅ Cleaned up any duplicate company_settings rows';
    
    -- Now add the unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.company_settings'::regclass 
          AND conname = 'company_settings_user_id_key'
    ) THEN
        ALTER TABLE public.company_settings 
        ADD CONSTRAINT company_settings_user_id_key UNIQUE (user_id);
        
        RAISE NOTICE '✅ Added unique constraint on company_settings.user_id';
    ELSE
        RAISE NOTICE '✓ Unique constraint already exists on company_settings.user_id';
    END IF;
END $$;

-- ============================================
-- PART 3: SYNC EXISTING DATA FOR ALL USERS
-- ============================================

-- Sync ALL existing user_profiles data to company_settings
-- This ensures all existing users have their data in both tables
INSERT INTO public.company_settings (
    user_id,
    organization_name,
    organization_id,
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
    organization_id,
    ein,
    COALESCE(tax_id, ein) as tax_id,
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
    NOW(),
    NOW()
FROM public.user_profiles
WHERE user_id IS NOT NULL  -- Sync ALL users, not just one
  AND (
    organization_name IS NOT NULL 
    OR ein IS NOT NULL 
    OR tax_id IS NOT NULL
    OR duns_number IS NOT NULL
  )  -- Only sync users with organization data
ON CONFLICT (user_id) 
DO UPDATE SET
    organization_name = EXCLUDED.organization_name,
    organization_id = EXCLUDED.organization_id,
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
    updated_at = NOW();

-- Show how many users were synced
SELECT 
    'SYNC SUMMARY' as info,
    COUNT(*) as total_users_synced
FROM public.company_settings;

-- ============================================
-- PART 4: VERIFY FIX FOR ALL USERS
-- ============================================

-- Verify constraint exists
SELECT 
    '✅ CONSTRAINT VERIFICATION' as check_type,
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.company_settings'::regclass
  AND conname = 'company_settings_user_id_key';

-- Count users in each table
SELECT 
    'USER PROFILES COUNT' as table_name,
    COUNT(*) as total_users,
    COUNT(CASE WHEN organization_name IS NOT NULL THEN 1 END) as users_with_org_data
FROM public.user_profiles;

SELECT 
    'COMPANY SETTINGS COUNT' as table_name,
    COUNT(*) as total_users,
    COUNT(CASE WHEN organization_name IS NOT NULL THEN 1 END) as users_with_org_data
FROM public.company_settings;

-- Verify YOUR specific data
SELECT 
    '✅ YOUR USER PROFILE' as check_type,
    id,
    user_id,
    full_name,
    organization_name,
    ein,
    tax_id,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';

SELECT 
    '✅ YOUR COMPANY SETTINGS' as check_type,
    id,
    user_id,
    organization_name,
    ein,
    tax_id,
    updated_at
FROM public.company_settings
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b';

-- Check for any users missing from company_settings
SELECT 
    '⚠️ USERS MISSING FROM COMPANY_SETTINGS' as check_type,
    COUNT(*) as missing_count
FROM public.user_profiles up
WHERE up.user_id IS NOT NULL
  AND (up.organization_name IS NOT NULL OR up.ein IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.company_settings cs 
    WHERE cs.user_id = up.user_id
  );
