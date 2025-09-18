-- Complete Projects Table Schema Fix
-- Run this in your Supabase SQL editor

-- First, check if projects table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    -- Create projects table if it doesn't exist
    CREATE TABLE projects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    RAISE NOTICE '✅ Created projects table';
  END IF;
END $$;

-- Add missing columns (IF NOT EXISTS prevents errors if they already exist)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'other';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'Unspecified';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Financial columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS total_project_budget NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS funding_request_amount NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cash_match_available NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS in_kind_match_available NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_people_served INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS amount_raised NUMERIC;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS funding_goal NUMERIC;

-- CRITICAL: Array columns must be JSONB type
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_categories JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS primary_goals JSONB DEFAULT '[]';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS preferred_funding_types JSONB DEFAULT '[]';

-- Date columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS proposed_start_date DATE;

-- Add foreign key constraint to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_user_id_fkey'
  ) THEN
    -- Check if user_profiles table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
      ALTER TABLE projects ADD CONSTRAINT projects_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
      RAISE NOTICE '✅ Added foreign key constraint to user_profiles';
    ELSE
      RAISE NOTICE '⚠️  user_profiles table not found - skipping foreign key constraint';
    END IF;
  END IF;
END $$;

-- Enable RLS (Row Level Security)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS projects_project_type_idx ON projects(project_type);

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test notification
RAISE NOTICE '✅ Projects table schema update complete!';