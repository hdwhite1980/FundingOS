-- RE-ENABLE RLS WITH PERMISSIVE POLICIES FOR CHAT TABLES
-- Run this after confirming chat works with RLS disabled

-- Re-enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Allow all operations on chat_sessions" ON public.chat_sessions;

DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON public.chat_messages;

-- Create very permissive policies for chat_sessions
CREATE POLICY "Allow all operations on chat_sessions" ON public.chat_sessions
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create very permissive policies for chat_messages  
CREATE POLICY "Allow all operations on chat_messages" ON public.chat_messages
  FOR ALL 
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '✅ RLS RE-ENABLED WITH PERMISSIVE POLICIES';
    RAISE NOTICE '   All operations allowed for both authenticated users';
    RAISE NOTICE '   and service role API calls.';
    RAISE NOTICE '   Chat should continue working normally.';
    RAISE NOTICE '=======================================================';
END $$;