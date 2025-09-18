-- TEMPORARY FIX: Disable RLS on projects table for debugging
-- This will help us determine if the issue is RLS or something else
-- Run this in Supabase SQL Editor

BEGIN;

-- First run the safe schema fix
-- (You can copy/paste the fix-projects-schema-safe.sql content here if needed)

-- Temporarily disable RLS to test if project creation works
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Test message
DO $$
BEGIN
  RAISE NOTICE '⚠️  TEMPORARILY DISABLED RLS ON PROJECTS TABLE';
  RAISE NOTICE '   Try creating a project now to see if it works';
  RAISE NOTICE '   If it works, the issue is authentication/RLS policies';
  RAISE NOTICE '   If it still fails, the issue is schema/data validation';
END $$;