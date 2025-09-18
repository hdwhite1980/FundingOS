-- AI Assistant Extensions Schema (Conversation Persistence + Context Cache)

-- 1. Conversation Sessions
CREATE TABLE IF NOT EXISTS assistant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- 2. Conversation Turns
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  summarized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_session_created ON assistant_conversations(session_id, created_at);

-- 3. Context Cache
CREATE TABLE IF NOT EXISTS ai_org_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_version TEXT DEFAULT '1',
  context_hash TEXT NOT NULL,
  context_json JSONB NOT NULL,
  refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, context_version)
);
CREATE INDEX IF NOT EXISTS idx_ai_org_context_cache_user ON ai_org_context_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_org_context_cache_refreshed ON ai_org_context_cache(refreshed_at DESC);

-- 4. Conversation Summaries (rolling condensation of earlier turns)
CREATE TABLE IF NOT EXISTS assistant_session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_version INTEGER DEFAULT 1,
  summary_text TEXT NOT NULL,
  covered_until TIMESTAMPTZ NOT NULL, -- latest conversation created_at included
  turns_covered INTEGER DEFAULT 0,
  total_tokens_estimated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assistant_session_summaries_session ON assistant_session_summaries(session_id, created_at DESC);

-- RLS Enable
ALTER TABLE assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_org_context_cache ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own sessions" ON assistant_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON assistant_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON assistant_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users view own conversation" ON assistant_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conversation" ON assistant_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own context cache" ON ai_org_context_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own context cache" ON ai_org_context_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own context cache" ON ai_org_context_cache FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to update last interaction
CREATE OR REPLACE FUNCTION touch_assistant_session()
RETURNS trigger AS $$
BEGIN
  UPDATE assistant_sessions SET last_interaction_at = NOW() WHERE id = NEW.session_id;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_assistant_session ON assistant_conversations;
CREATE TRIGGER trg_touch_assistant_session
  AFTER INSERT ON assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION touch_assistant_session();

-- Completion Notice
DO $$ BEGIN
  RAISE NOTICE 'AI Assistant extensions schema loaded (sessions, conversations, cache)';
END $$;
