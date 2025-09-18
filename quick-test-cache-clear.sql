-- QUICK TEST: Temporarily disable RLS again
-- Run this to test if the cache clearing worked

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE '⚠️  RLS DISABLED AGAIN FOR CACHE TESTING';
  RAISE NOTICE '   Try creating a project now';
  RAISE NOTICE '   Check browser console for "DEBUG: Using projectService.createProject" message';
  RAISE NOTICE '   If you see that message, the cache cleared successfully';
END $$;