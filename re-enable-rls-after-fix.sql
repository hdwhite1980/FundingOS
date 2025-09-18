-- Re-enable RLS after confirming project creation works
-- ONLY run this AFTER the project creation works with RLS disabled
-- Run this in Supabase SQL Editor

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies (in case they got lost)
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

-- Test message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS RE-ENABLED on projects table';
  RAISE NOTICE '   Project creation should now work with proper authentication';
  RAISE NOTICE '   Make sure you are using projectService.createProject (session-based)';
  RAISE NOTICE '   NOT directUserServices.projects.createProject (bypasses auth)';
END $$;