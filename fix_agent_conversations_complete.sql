-- Fix agent_conversations table structure
-- This fixes both missing 'role' and 'content' columns

-- First, let's see what columns actually exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agent_conversations' 
ORDER BY ordinal_position;

-- Add missing columns
ALTER TABLE agent_conversations 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE agent_conversations 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add other commonly needed columns for agent conversations
ALTER TABLE agent_conversations 
ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE agent_conversations 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to have safe defaults
UPDATE agent_conversations 
SET role = 'user' 
WHERE role IS NULL;

UPDATE agent_conversations 
SET content = 'Legacy conversation message'
WHERE content IS NULL;

UPDATE agent_conversations 
SET created_at = NOW()
WHERE created_at IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_conversations_role ON agent_conversations(role);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON agent_conversations(created_at);

-- Verify all columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'agent_conversations' 
ORDER BY ordinal_position;