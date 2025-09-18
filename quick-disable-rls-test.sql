-- TEMPORARY: Disable RLS on projects table to test if authentication is the issue
-- Run this in Supabase SQL Editor, then try creating a project

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Test message
DO $$
BEGIN
  RAISE NOTICE '⚠️  TEMPORARILY DISABLED RLS ON PROJECTS TABLE';
  RAISE NOTICE '   Try creating a project now to see if it works';
  RAISE NOTICE '   If it works, the issue is authentication/session';
  RAISE NOTICE '   If it still fails, the issue is schema/data validation';
END $$;