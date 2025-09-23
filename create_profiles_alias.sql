-- Create profiles table as alias to existing user_profiles table
-- This fixes the "column profiles.setup_completed does not exist" error

-- Create profiles table that references your existing user_profiles structure
CREATE TABLE IF NOT EXISTS public.profiles (
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
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Copy existing data from user_profiles to profiles
INSERT INTO public.profiles (user_id, email, full_name, organization_name, organization_type, user_role, setup_completed, two_factor_enabled, avatar_url, website, created_at, updated_at)
SELECT user_id, email, full_name, organization_name, organization_type, user_role, setup_completed, two_factor_enabled, avatar_url, website, created_at, updated_at
FROM public.user_profiles
ON CONFLICT (user_id) DO NOTHING;

-- Update the handle_new_user function to insert into both tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
begin
  -- Insert into user_profiles (your existing table)
  insert into public.user_profiles (user_id, email, full_name, user_role, setup_completed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'user_role', 'company'),
    false
  ) ON CONFLICT (user_id) DO NOTHING;
  
  -- Insert into profiles (what the system expects)
  insert into public.profiles (user_id, email, full_name, user_role, setup_completed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'user_role', 'company'),
    false
  ) ON CONFLICT (user_id) DO NOTHING;
  
  return new;
end;
$$;

-- Verify both tables exist
SELECT 
    'TABLE STATUS' as check_type,
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'user_profiles')
ORDER BY table_name;