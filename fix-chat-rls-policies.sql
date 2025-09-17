-- FIX CHAT TABLES RLS POLICIES FOR AUTHENTICATION ISSUES
-- This fixes the RLS policy violations when saving chat messages

-- ================================================================
-- 1. CHECK CURRENT RLS POLICIES ON CHAT TABLES
-- ================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '🔍 CHECKING CURRENT CHAT TABLE RLS POLICIES';
    RAISE NOTICE '=======================================================';
    
    -- Check RLS policies on chat_sessions and chat_messages
    FOR rec IN 
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies 
        WHERE tablename IN ('chat_sessions', 'chat_messages')
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE '📋 Table: % | Policy: % | Command: % | Roles: %', 
            rec.tablename, rec.policyname, rec.cmd, rec.roles;
    END LOOP;
END $$;

-- ================================================================
-- 2. DROP EXISTING PROBLEMATIC POLICIES
-- ================================================================

-- Drop existing chat_sessions policies
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Service role can manage chat sessions" ON public.chat_sessions;

-- Drop existing chat_messages policies  
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Service role can manage chat messages" ON public.chat_messages;

-- ================================================================
-- 3. CREATE FLEXIBLE RLS POLICIES FOR CHAT TABLES
-- ================================================================

-- Enable RLS if not already enabled
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ==== CHAT_SESSIONS POLICIES ====

-- Allow authenticated users to view their own sessions
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
  FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- Allow authenticated users and service role to insert sessions
CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- Allow authenticated users and service role to update sessions
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions
  FOR UPDATE 
  USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- Allow authenticated users and service role to delete sessions
CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions
  FOR DELETE 
  USING (
    auth.uid() = user_id OR 
    auth.role() = 'service_role'
  );

-- ==== CHAT_MESSAGES POLICIES ====

-- Allow users to view messages from their sessions
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    ) OR 
    auth.role() = 'service_role'
  );

-- Allow users and service role to insert messages
CREATE POLICY "Users can insert own chat messages" ON public.chat_messages
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    ) OR 
    auth.role() = 'service_role'
  );

-- Allow users and service role to update messages  
CREATE POLICY "Users can update own chat messages" ON public.chat_messages
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    ) OR 
    auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    ) OR 
    auth.role() = 'service_role'
  );

-- Allow users and service role to delete messages
CREATE POLICY "Users can delete own chat messages" ON public.chat_messages
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs 
      WHERE cs.id = chat_messages.session_id 
      AND cs.user_id = auth.uid()
    ) OR 
    auth.role() = 'service_role'
  );

-- ================================================================
-- 4. VERIFY NEW POLICIES
-- ================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '✅ NEW CHAT TABLE RLS POLICIES CREATED';
    RAISE NOTICE '=======================================================';
    
    -- List new policies
    FOR rec IN 
        SELECT 
            tablename,
            policyname,
            cmd
        FROM pg_policies 
        WHERE tablename IN ('chat_sessions', 'chat_messages')
        ORDER BY tablename, cmd, policyname
    LOOP
        RAISE NOTICE '✅ %: % (%)', rec.tablename, rec.policyname, rec.cmd;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 CHAT SHOULD NOW WORK FOR:';
    RAISE NOTICE '  - Authenticated users (with session cookies)';
    RAISE NOTICE '  - Service role API calls (fallback for no session)';
    RAISE NOTICE '  - Both scenarios handled gracefully';
    RAISE NOTICE '=======================================================';
END $$;