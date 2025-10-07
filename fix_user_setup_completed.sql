-- Fix setup_completed for user hdwhite@ahts4me.com
-- This will set setup_completed to true so the user can access their profile

UPDATE public.user_profiles
SET 
    setup_completed = true,
    updated_at = NOW()
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
   OR email = 'hdwhite@ahts4me.com';

-- Verify the update
SELECT 
    user_id,
    email,
    setup_completed,
    organization_name,
    updated_at
FROM public.user_profiles
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
   OR email = 'hdwhite@ahts4me.com';
