-- Fix orphaned projects by assigning them to the correct user
-- STEP 1: Run diagnose-orphaned-projects.sql first to get your user_id
-- STEP 2: Replace 'YOUR_USER_ID_HERE' below with your actual user_id from user_profiles table
-- STEP 3: Run this script

-- UPDATE: Replace with your actual user_id from the diagnosis script
-- Example: UPDATE projects SET user_id = '12345678-1234-1234-1234-123456789012' WHERE user_id IS NULL;

-- UNCOMMENT AND MODIFY THE LINE BELOW:
-- UPDATE projects SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;

-- After updating, verify the fix worked:
SELECT 
    id,
    name,
    user_id,
    created_at,
    CASE 
        WHEN user_id IS NULL THEN '❌ Still orphaned'
        ELSE '✅ Fixed'
    END as status
FROM projects 
ORDER BY created_at DESC
LIMIT 5;

DO $$
BEGIN
    RAISE NOTICE '✅ PROJECTS SHOULD NOW BE VISIBLE';
    RAISE NOTICE '   The projects should now appear in your dashboard';
    RAISE NOTICE '   RLS policies will now allow you to see/edit them';
END $$;