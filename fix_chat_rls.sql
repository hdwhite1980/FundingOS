-- Quick fix for chat RLS policies
-- Run this immediately to fix the chat system

-- Ensure RLS is enabled
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (in case they're incorrect)
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create their own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own chat messages" ON chat_messages;

-- Create correct RLS policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create correct RLS policies for chat_messages
CREATE POLICY "Users can view their own chat messages" ON chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat messages" ON chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Verify the function exists
CREATE OR REPLACE FUNCTION close_active_chat_sessions(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE chat_sessions 
  SET is_active = false, 
      session_end = NOW(),
      updated_at = NOW()
  WHERE user_id = user_uuid AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION close_active_chat_sessions(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Chat RLS Policy Fix Complete!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Fixed RLS policies for:';
  RAISE NOTICE '- chat_sessions (user-owned data)';
  RAISE NOTICE '- chat_messages (user-owned data)';
  RAISE NOTICE '- close_active_chat_sessions function granted to authenticated users';
  RAISE NOTICE 'Chat system should now work properly!';
  RAISE NOTICE '=======================================================';
END $$;