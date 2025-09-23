-- Simple fix: Update services to use existing user_profiles table
-- Just ensure your user_profiles table has the setup_completed column

-- Add setup_completed column to your existing user_profiles table if it doesn't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- Verify the column was added
SELECT 
    'USER_PROFILES SETUP_COMPLETED COLUMN' as check_type,
    column_name,
    data_type,
    'EXISTS' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'setup_completed';