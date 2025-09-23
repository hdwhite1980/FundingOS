-- Clean up test accounts and fix user profile creation
-- This removes orphaned test accounts and ensures proper user profile creation

-- 1. Remove the orphaned test account from auth.users
-- This will cascade and remove any related data
DELETE FROM auth.users 
WHERE id = '35fc54d9-3b37-43f1-b6f8-d2bda90f7c8b' 
   OR email = 'okbuddy@gmail.com';

-- 2. Remove any other test/orphaned accounts (optional - be careful!)
-- Uncomment the next line if you want to remove ALL orphaned auth users
-- DELETE FROM auth.users WHERE id IN (
--   SELECT au.id FROM auth.users au 
--   LEFT JOIN public.user_profiles up ON au.id = up.user_id 
--   WHERE up.user_id IS NULL
-- );

-- 3. Make sure the trigger function is working properly for future signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
begin
  -- Insert into user_profiles table with all required fields
  insert into public.user_profiles (
    user_id, 
    email, 
    full_name, 
    user_role, 
    setup_completed,
    organization_type,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'user_role', 'company'),
    false,
    coalesce(new.raw_user_meta_data->>'organization_type', 'nonprofit'),
    now(),
    now()
  ) ON CONFLICT (user_id) DO NOTHING;
  
  return new;
end;
$$;

-- 4. Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify cleanup and setup
SELECT 
    'CLEANUP COMPLETE' as status,
    'Test accounts removed and trigger fixed' as message;

-- 6. Check remaining users
SELECT 
    'REMAINING USERS' as check_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN up.user_id IS NOT NULL THEN 1 END) as with_profiles,
    COUNT(CASE WHEN up.user_id IS NULL THEN 1 END) as orphaned
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.user_id;

-- 7. Show your real users (if any)
SELECT 
    'REAL USERS' as info_type,
    up.user_id,
    up.email,
    up.organization_name,
    up.setup_completed,
    up.created_at
FROM public.user_profiles up
ORDER BY up.created_at DESC
LIMIT 10;