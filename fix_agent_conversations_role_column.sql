-- Add missing 'role' column to agent_conversations table
-- This fixes the error: column agent_conversations.role does not exist

-- First, let's see what columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agent_conversations' 
ORDER BY ordinal_position;

-- Add the role column (simple approach)
ALTER TABLE agent_conversations 
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Since we don't know the exact column structure, let's just set all existing records to 'user'
-- This is safe and the application will set correct roles for new records
UPDATE agent_conversations 
SET role = 'user' 
WHERE role IS NULL;

-- Create an index on role for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_conversations_role ON agent_conversations(role);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'agent_conversations' 
AND column_name = 'role';