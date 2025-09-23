-- Fix profiles table issue - add missing setup_completed column
-- This resolves the "column profiles.setup_completed does not exist" error

-- Option 1: If you have a 'profiles' table, add the missing column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;

-- Option 2: If you don't have a 'profiles' table, create it as an alias/view to user_profiles
-- First check if profiles table exists
DO $$
BEGIN
    -- Check if profiles table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        -- Create profiles table that matches what the system expects
        CREATE TABLE public.profiles (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
            email TEXT,
            full_name TEXT,
            organization_name TEXT,
            organization_type TEXT DEFAULT 'nonprofit',
            user_role TEXT DEFAULT 'company',
            setup_completed BOOLEAN DEFAULT FALSE,
            two_factor_enabled BOOLEAN DEFAULT FALSE,
            avatar_url TEXT,
            website TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Users can view their own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can update their own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own profile" ON public.profiles
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- Copy data from user_profiles if it exists and has data
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
            INSERT INTO public.profiles (user_id, email, full_name, organization_name, organization_type, user_role, setup_completed, two_factor_enabled, avatar_url, website, created_at, updated_at)
            SELECT user_id, email, full_name, organization_name, organization_type, user_role, setup_completed, two_factor_enabled, avatar_url, website, created_at, updated_at
            FROM public.user_profiles
            ON CONFLICT (user_id) DO NOTHING;
        END IF;

        RAISE NOTICE 'Created profiles table and copied data from user_profiles';
    ELSE
        -- Profiles table exists, just add the missing column
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added setup_completed column to existing profiles table';
    END IF;
END $$;

-- Update the handle_new_user function to work with profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
begin
  -- Insert into profiles table (the one the system expects)
  insert into public.profiles (user_id, email, full_name, user_role, setup_completed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'user_role', 'company'),
    false
  ) ON CONFLICT (user_id) DO NOTHING;
  
  -- Also insert into user_profiles if it exists (for compatibility)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    insert into public.user_profiles (user_id, email, full_name, user_role, setup_completed)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
      coalesce(new.raw_user_meta_data->>'user_role', 'company'),
      false
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  return new;
end;
$$;

-- Verify the fix
SELECT 
    'PROFILES TABLE STATUS' as check_type,
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'user_profiles')
ORDER BY table_name;

-- Check if setup_completed column exists in profiles table
SELECT 
    'SETUP_COMPLETED COLUMN' as check_type,
    column_name,
    data_type,
    'EXISTS' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'setup_completed';