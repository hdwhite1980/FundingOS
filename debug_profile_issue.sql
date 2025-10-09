-- Debug: Check if there are duplicate profiles or schema issues
-- Run this in Supabase SQL Editor for user: 187c155b-b079-4d5c-bd68-0ce36b99cd2b

-- Check all profiles for this user
SELECT 
  id,
  user_id,
  email,
  organization_name,
  tax_id,
  date_incorporated,
  state_incorporated,
  duns_uei_number,
  created_at,
  updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
   OR id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY updated_at DESC;

-- Check if there are multiple profiles
SELECT 
  COUNT(*) as profile_count,
  user_id
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
   OR id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
GROUP BY user_id;
