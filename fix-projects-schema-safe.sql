-- Safe Projects Table Schema Fix
-- This script handles text[] to JSONB conversion properly
-- Run this in Supabase SQL Editor

BEGIN;

-- Create projects table if it doesn't exist
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Ensure user_id column exists and references user_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='user_id') THEN
    ALTER TABLE projects ADD COLUMN user_id UUID;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='projects_user_id_fkey') THEN
    ALTER TABLE projects ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Core required text fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='name') THEN
    ALTER TABLE projects ADD COLUMN name TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='description') THEN
    ALTER TABLE projects ADD COLUMN description TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='location') THEN
    ALTER TABLE projects ADD COLUMN location TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_type') THEN
    ALTER TABLE projects ADD COLUMN project_type TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_category') THEN
    ALTER TABLE projects ADD COLUMN project_category TEXT;
  END IF;
END $$;

-- Array/JSON fields - handle conversion safely
DO $$
DECLARE
  col_type TEXT;
BEGIN
  -- Handle project_categories
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_categories') THEN
    ALTER TABLE projects ADD COLUMN project_categories JSONB DEFAULT '[]';
  ELSE
    SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name='projects' AND column_name='project_categories';
    IF col_type != 'jsonb' THEN
      -- Drop and recreate to avoid conversion issues
      ALTER TABLE projects DROP COLUMN project_categories;
      ALTER TABLE projects ADD COLUMN project_categories JSONB DEFAULT '[]';
    END IF;
  END IF;
  
  -- Handle primary_goals
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='primary_goals') THEN
    ALTER TABLE projects ADD COLUMN primary_goals JSONB DEFAULT '[]';
  ELSE
    SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name='projects' AND column_name='primary_goals';
    IF col_type != 'jsonb' THEN
      ALTER TABLE projects DROP COLUMN primary_goals;
      ALTER TABLE projects ADD COLUMN primary_goals JSONB DEFAULT '[]';
    END IF;
  END IF;
  
  -- Handle preferred_funding_types
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='preferred_funding_types') THEN
    ALTER TABLE projects ADD COLUMN preferred_funding_types JSONB DEFAULT '[]';
  ELSE
    SELECT data_type INTO col_type FROM information_schema.columns WHERE table_name='projects' AND column_name='preferred_funding_types';
    IF col_type != 'jsonb' THEN
      ALTER TABLE projects DROP COLUMN preferred_funding_types;
      ALTER TABLE projects ADD COLUMN preferred_funding_types JSONB DEFAULT '[]';
    END IF;
  END IF;
END $$;

-- Financial fields - NUMERIC type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='total_project_budget') THEN
    ALTER TABLE projects ADD COLUMN total_project_budget NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='funding_request_amount') THEN
    ALTER TABLE projects ADD COLUMN funding_request_amount NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='cash_match_available') THEN
    ALTER TABLE projects ADD COLUMN cash_match_available NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='in_kind_match_available') THEN
    ALTER TABLE projects ADD COLUMN in_kind_match_available NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='estimated_people_served') THEN
    ALTER TABLE projects ADD COLUMN estimated_people_served INTEGER;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='amount_raised') THEN
    ALTER TABLE projects ADD COLUMN amount_raised NUMERIC DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='funding_goal') THEN
    ALTER TABLE projects ADD COLUMN funding_goal NUMERIC;
  END IF;
END $$;

-- Budget breakdown percentage fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='personnel_percentage') THEN
    ALTER TABLE projects ADD COLUMN personnel_percentage NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='equipment_percentage') THEN
    ALTER TABLE projects ADD COLUMN equipment_percentage NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='travel_percentage') THEN
    ALTER TABLE projects ADD COLUMN travel_percentage NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='indirect_percentage') THEN
    ALTER TABLE projects ADD COLUMN indirect_percentage NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='other_percentage') THEN
    ALTER TABLE projects ADD COLUMN other_percentage NUMERIC;
  END IF;
END $$;

-- Status field
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='status') THEN
    ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'draft';
  END IF;
END $$;

-- Date fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='proposed_start_date') THEN
    ALTER TABLE projects ADD COLUMN proposed_start_date DATE;
  END IF;
END $$;

-- Legacy compatibility fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='funding_needed') THEN
    ALTER TABLE projects ADD COLUMN funding_needed NUMERIC;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='timeline') THEN
    ALTER TABLE projects ADD COLUMN timeline TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='industry') THEN
    ALTER TABLE projects ADD COLUMN industry TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='target_population') THEN
    ALTER TABLE projects ADD COLUMN target_population TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='expected_jobs_created') THEN
    ALTER TABLE projects ADD COLUMN expected_jobs_created INTEGER;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='environmental_impact') THEN
    ALTER TABLE projects ADD COLUMN environmental_impact TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='matching_funds_available') THEN
    ALTER TABLE projects ADD COLUMN matching_funds_available NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Set default values for required fields
UPDATE projects SET name = COALESCE(name, '');
UPDATE projects SET description = COALESCE(description, '');
UPDATE projects SET location = COALESCE(location, 'Unspecified');
UPDATE projects SET project_type = COALESCE(project_type, 'other');

-- Set defaults and constraints
ALTER TABLE projects ALTER COLUMN name SET DEFAULT '';
ALTER TABLE projects ALTER COLUMN description SET DEFAULT '';
ALTER TABLE projects ALTER COLUMN location SET DEFAULT 'Unspecified';
ALTER TABLE projects ALTER COLUMN project_type SET DEFAULT 'other';

-- Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for projects
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

COMMIT;

-- Test the schema
DO $$
BEGIN
  RAISE NOTICE 'Safe projects table schema update completed successfully';
  RAISE NOTICE 'Array columns have been safely recreated as JSONB';
END $$;