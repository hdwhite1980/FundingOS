-- Safe RLS Policy Fix - Checks for column existence first
-- This script addresses the RLS policy violations with proper column checking

-- ======================================================================
-- 1. ENABLE RLS AND CREATE POLICIES FOR PROJECTS TABLE
-- ======================================================================

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Check if projects table has user_id column and create policies accordingly
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='user_id') THEN
    -- Create RLS policies for projects table
    EXECUTE 'CREATE POLICY "Users can view their own projects" ON projects FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can insert their own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can delete their own projects" ON projects FOR DELETE USING (auth.uid() = user_id)';
    RAISE NOTICE 'Projects RLS policies created with user_id column';
  ELSE
    RAISE NOTICE 'Projects table does not have user_id column - skipping RLS policies';
  END IF;
END $$;

-- ======================================================================
-- 2. ENABLE RLS AND CREATE POLICIES FOR OPPORTUNITIES TABLE
-- ======================================================================

-- Enable RLS on opportunities table
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "All users can view opportunities" ON opportunities;
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON opportunities;
DROP POLICY IF EXISTS "Authenticated users can update opportunities" ON opportunities;

-- Create RLS policies for opportunities table (shared data)
CREATE POLICY "All users can view opportunities" ON opportunities
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert opportunities" ON opportunities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update opportunities" ON opportunities
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ======================================================================
-- 3. ENABLE RLS AND CREATE POLICIES FOR CHAT_SESSIONS TABLE
-- ======================================================================

-- Check if chat_sessions table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='chat_sessions') THEN
    -- Enable RLS on chat_sessions table
    ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
    DROP POLICY IF EXISTS "Users can create their own chat sessions" ON chat_sessions;
    DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;
    
    -- Check for user_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='user_id') THEN
      EXECUTE 'CREATE POLICY "Users can view their own chat sessions" ON chat_sessions FOR SELECT USING (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "Users can create their own chat sessions" ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "Users can update their own chat sessions" ON chat_sessions FOR UPDATE USING (auth.uid() = user_id)';
      RAISE NOTICE 'Chat sessions RLS policies created';
    ELSE
      RAISE NOTICE 'Chat sessions table does not have user_id column';
    END IF;
  ELSE
    RAISE NOTICE 'Chat sessions table does not exist - skipping';
  END IF;
END $$;

-- ======================================================================
-- 4. ENABLE RLS AND CREATE POLICIES FOR CHAT_MESSAGES TABLE
-- ======================================================================

-- Check if chat_messages table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='chat_messages') THEN
    -- Enable RLS on chat_messages table
    ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
    DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;
    DROP POLICY IF EXISTS "Users can update their own chat messages" ON chat_messages;
    
    -- Check for user_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='user_id') THEN
      EXECUTE 'CREATE POLICY "Users can view their own chat messages" ON chat_messages FOR SELECT USING (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "Users can create their own chat messages" ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id)';
      EXECUTE 'CREATE POLICY "Users can update their own chat messages" ON chat_messages FOR UPDATE USING (auth.uid() = user_id)';
      RAISE NOTICE 'Chat messages RLS policies created';
    ELSE
      RAISE NOTICE 'Chat messages table does not have user_id column';
    END IF;
  ELSE
    RAISE NOTICE 'Chat messages table does not exist - skipping';
  END IF;
END $$;

-- ======================================================================
-- 5. VERIFY USER_PROFILES TABLE HAS PROPER RLS
-- ======================================================================

-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Check which column user_profiles uses for user identification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='user_id') THEN
    -- Use user_id column
    EXECUTE 'CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id)';
    RAISE NOTICE 'User profiles RLS policies created with user_id column';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='id') THEN
    -- Use id column (typical for Supabase auth.users relationship)
    EXECUTE 'CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = id)';
    EXECUTE 'CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id)';
    EXECUTE 'CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id)';
    RAISE NOTICE 'User profiles RLS policies created with id column';
  ELSE
    RAISE NOTICE 'User profiles table does not have user_id or id column';
  END IF;
END $$;

-- ======================================================================
-- 6. CREATE INDEXES FOR BETTER PERFORMANCE
-- ======================================================================

-- Create indexes with column existence checks
DO $$
BEGIN
  -- Projects table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    RAISE NOTICE 'Created index on projects.user_id';
  END IF;
  
  -- Opportunities table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='source') THEN
    CREATE INDEX IF NOT EXISTS idx_opportunities_source ON opportunities(source);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='status') THEN
    CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
  END IF;
  
  -- Chat tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='chat_sessions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_sessions' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='chat_messages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='session_id') THEN
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
    END IF;
  END IF;
  
  -- User profiles
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='id') THEN
    CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
  END IF;
  
  RAISE NOTICE 'All applicable indexes created';
END $$;

-- ======================================================================
-- 7. CHECK TABLE STRUCTURE AND PROVIDE RECOMMENDATIONS
-- ======================================================================

DO $$
DECLARE
  table_info TEXT := '';
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'TABLE STRUCTURE ANALYSIS';
  RAISE NOTICE '=======================================================';
  
  -- Check projects table
  SELECT string_agg(column_name, ', ') INTO table_info
  FROM information_schema.columns 
  WHERE table_name = 'projects' AND column_name IN ('id', 'user_id', 'name', 'description');
  
  RAISE NOTICE 'projects table columns: %', COALESCE(table_info, 'table not found');
  
  -- Check opportunities table
  SELECT string_agg(column_name, ', ') INTO table_info
  FROM information_schema.columns 
  WHERE table_name = 'opportunities' AND column_name IN ('id', 'title', 'source', 'status');
  
  RAISE NOTICE 'opportunities table columns: %', COALESCE(table_info, 'table not found');
  
  -- Check user_profiles table
  SELECT string_agg(column_name, ', ') INTO table_info
  FROM information_schema.columns 
  WHERE table_name = 'user_profiles' AND column_name IN ('id', 'user_id', 'email', 'full_name');
  
  RAISE NOTICE 'user_profiles table columns: %', COALESCE(table_info, 'table not found');
END $$;

-- ======================================================================
-- COMPLETION MESSAGE
-- ======================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Safe RLS Policy Fix Complete!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Fixed RLS policies for existing tables with proper columns:';
  RAISE NOTICE '- projects (if user_id exists)';
  RAISE NOTICE '- opportunities (shared, authenticated access)';
  RAISE NOTICE '- chat_sessions (if exists and has user_id)';
  RAISE NOTICE '- chat_messages (if exists and has user_id)';
  RAISE NOTICE '- user_profiles (with id or user_id column)';
  RAISE NOTICE '';
  RAISE NOTICE 'All applicable indexes created for optimal performance.';
  RAISE NOTICE 'Check the table structure analysis above for details.';
  RAISE NOTICE 'Your database should now allow proper project and opportunity access!';
  RAISE NOTICE '=======================================================';
END $$;