-- Fix Row Level Security for projects and opportunities tables
-- This script addresses the RLS policy violations preventing project creation and opportunity access

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

-- Create RLS policies for projects table
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- ======================================================================
-- 2. ENABLE RLS AND CREATE POLICIES FOR OPPORTUNITIES TABLE
-- ======================================================================

-- Enable RLS on opportunities table
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "All users can view opportunities" ON opportunities;
DROP POLICY IF EXISTS "Authenticated users can insert opportunities" ON opportunities;
DROP POLICY IF EXISTS "Authenticated users can update opportunities" ON opportunities;

-- Create RLS policies for opportunities table
-- Opportunities should be viewable by all authenticated users since they're shared funding sources
CREATE POLICY "All users can view opportunities" ON opportunities
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only allow system/admin inserts for opportunities (from external syncing)
-- For now, allow all authenticated users to insert opportunities
CREATE POLICY "Authenticated users can insert opportunities" ON opportunities
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow updates for authenticated users (for enriching opportunity data)
CREATE POLICY "Authenticated users can update opportunities" ON opportunities
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ======================================================================
-- 3. ENABLE RLS AND CREATE POLICIES FOR CHAT_SESSIONS TABLE
-- ======================================================================

-- Enable RLS on chat_sessions table (if not already enabled)
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;

-- Create RLS policies for chat_sessions table
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- ======================================================================
-- 4. ENABLE RLS AND CREATE POLICIES FOR CHAT_MESSAGES TABLE
-- ======================================================================

-- Enable RLS on chat_messages table (if not already enabled)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON chat_messages;

-- Create RLS policies for chat_messages table
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- ======================================================================
-- 5. VERIFY USER_PROFILES TABLE HAS PROPER RLS
-- ======================================================================

-- Enable RLS on user_profiles table (if not already enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create RLS policies for user_profiles table
-- user_profiles table uses 'id' column, not 'user_id'
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- ======================================================================
-- 6. CREATE INDEXES FOR BETTER PERFORMANCE
-- ======================================================================

-- Create indexes for user_id lookups (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_source ON opportunities(source);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- ======================================================================
-- COMPLETION MESSAGE
-- ======================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'RLS Policy Fix Complete!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Fixed RLS policies for:';
  RAISE NOTICE '- projects (user-owned data)';
  RAISE NOTICE '- opportunities (shared, authenticated access)';
  RAISE NOTICE '- chat_sessions (user-owned data)';
  RAISE NOTICE '- chat_messages (user-owned data)';
  RAISE NOTICE '- user_profiles (user-owned data)';
  RAISE NOTICE '';
  RAISE NOTICE 'All indexes created for optimal performance.';
  RAISE NOTICE 'Your database should now allow proper project and opportunity access!';
  RAISE NOTICE '=======================================================';
END $$;