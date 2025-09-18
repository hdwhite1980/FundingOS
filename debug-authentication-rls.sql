-- DEBUG AUTHENTICATION AND RLS ISSUES
-- This script helps diagnose why auth.uid() is null during project creation

-- 1. Check if user authentication is working
DO $$
BEGIN
  RAISE NOTICE '🔍 DEBUGGING AUTHENTICATION CONTEXT';
  RAISE NOTICE '   Current auth.uid(): %', auth.uid();
  RAISE NOTICE '   Current auth.jwt(): %', auth.jwt();
  
  IF auth.uid() IS NULL THEN
    RAISE NOTICE '❌ auth.uid() is NULL - user is not authenticated';
    RAISE NOTICE '   This is why RLS policies are failing';
  ELSE
    RAISE NOTICE '✅ auth.uid() is: %', auth.uid();
    RAISE NOTICE '   User is authenticated';
  END IF;
END $$;

-- 2. Check current RLS policies on projects table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled' 
        ELSE '❌ RLS Disabled' 
    END as rls_status
FROM pg_tables 
WHERE tablename = 'projects';

-- 3. List all RLS policies on projects table
SELECT 
    pol.policyname as policy_name,
    pol.cmd as command,
    pol.permissive as is_permissive,
    pol.qual as using_expression,
    pol.with_check as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'projects';

-- 4. Test a sample project insert to see what fails
-- This will show the exact error
DO $$
DECLARE
    test_user_id UUID;
    current_auth_uid UUID;
BEGIN
    -- Get the current auth context
    current_auth_uid := auth.uid();
    
    RAISE NOTICE '🧪 TESTING PROJECT INSERT';
    RAISE NOTICE '   Current auth.uid(): %', current_auth_uid;
    
    IF current_auth_uid IS NULL THEN
        RAISE NOTICE '❌ Cannot test insert - no authenticated user';
        RAISE NOTICE '   This is the root cause of the RLS violation';
        RETURN;
    END IF;
    
    -- Try to insert a test project
    BEGIN
        INSERT INTO projects (
            user_id,
            name,
            description,
            location,
            project_type
        ) VALUES (
            current_auth_uid,
            'Test Project',
            'Test Description',
            'Test Location',
            'other'
        );
        
        RAISE NOTICE '✅ Test project insert succeeded';
        
        -- Clean up test data
        DELETE FROM projects WHERE name = 'Test Project' AND user_id = current_auth_uid;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Test project insert failed: %', SQLERRM;
        RAISE NOTICE '   Error code: %', SQLSTATE;
    END;
END $$;