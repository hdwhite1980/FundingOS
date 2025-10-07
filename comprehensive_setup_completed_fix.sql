-- Comprehensive fix for setup_completed column
-- Run this in Supabase SQL Editor

-- Step 1: Add setup_completed column if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- Step 2: Set setup_completed to true for your user
UPDATE public.user_profiles
SET 
    setup_completed = true,
    updated_at = NOW()
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
   OR email = 'hdwhite@ahts4me.com';

-- Step 3: Verify the fix
SELECT 
    user_id,
    email,
    setup_completed,
    organization_name,
    created_at,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
   OR email = 'hdwhite@ahts4me.com';

-- Step 4: Show all columns in user_profiles to confirm setup_completed exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name = 'setup_completed';
