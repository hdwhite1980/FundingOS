-- Fix user_profiles table to auto-generate id field
-- This will allow inserts/upserts to work properly without specifying id

-- Add UUID generation extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set default value for id column to auto-generate UUIDs
ALTER TABLE public.user_profiles 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Make user_id NOT NULL since it's required for lookups
ALTER TABLE public.user_profiles
ALTER COLUMN user_id SET NOT NULL;

-- Add unique constraint on user_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_profiles_user_id_key'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name IN ('id', 'user_id')
ORDER BY column_name;
