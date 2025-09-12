-- Quick test to verify both database schemas exist
-- Run this to check if tables are created properly

-- Check if chat session tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'chat_sessions' THEN '✅ Chat sessions table'
    WHEN table_name = 'chat_messages' THEN '✅ Chat messages table'
    WHEN table_name = 'sam_gov_usage' THEN '✅ SAM.gov usage table'
    ELSE table_name
  END as status
FROM information_schema.tables 
WHERE table_name IN ('chat_sessions', 'chat_messages', 'sam_gov_usage')
  AND table_schema = 'public'
ORDER BY table_name;

-- Show current SAM.gov usage if table exists
SELECT 
  date,
  request_count,
  '📊 Current usage' as status
FROM sam_gov_usage 
WHERE date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY date DESC
LIMIT 5;