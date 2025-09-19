-- Fix RLS policies for project_opportunities table
-- This script fixes the RLS policy violation when adding opportunities to projects

-- ======================================================================
-- ENABLE RLS AND CREATE POLICIES FOR PROJECT_OPPORTUNITIES TABLE
-- ======================================================================

-- Enable RLS on project_opportunities table
ALTER TABLE project_opportunities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own project opportunities" ON project_opportunities;
DROP POLICY IF EXISTS "Users can insert their own project opportunities" ON project_opportunities;
DROP POLICY IF EXISTS "Users can update their own project opportunities" ON project_opportunities;
DROP POLICY IF EXISTS "Users can delete their own project opportunities" ON project_opportunities;

-- Create RLS policies for project_opportunities table
CREATE POLICY "Users can view their own project opportunities" ON project_opportunities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own project opportunities" ON project_opportunities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project opportunities" ON project_opportunities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project opportunities" ON project_opportunities
  FOR DELETE USING (auth.uid() = user_id);

-- ======================================================================
-- VERIFY TABLE STRUCTURE AND ADD MISSING COLUMNS IF NEEDED
-- ======================================================================

-- Ensure user_id column exists
ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records without user_id to set it based on project owner
UPDATE project_opportunities 
SET user_id = p.user_id
FROM projects p 
WHERE project_opportunities.project_id = p.id 
AND project_opportunities.user_id IS NULL;

-- Make user_id NOT NULL after updating existing records
ALTER TABLE project_opportunities 
ALTER COLUMN user_id SET NOT NULL;

-- ======================================================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ======================================================================

-- Create indexes for user_id lookups (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_project_opportunities_user_id ON project_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_project_id ON project_opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_opportunity_id ON project_opportunities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_composite ON project_opportunities(user_id, project_id, opportunity_id);

-- ======================================================================
-- COMPLETION MESSAGE
-- ======================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Project Opportunities RLS Fix Complete!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Fixed RLS policies for project_opportunities table:';
  RAISE NOTICE '- Users can only access their own project opportunities';
  RAISE NOTICE '- INSERT, SELECT, UPDATE, DELETE policies enabled';
  RAISE NOTICE '- user_id column ensured and populated';
  RAISE NOTICE '- Performance indexes created';
  RAISE NOTICE '';
  RAISE NOTICE 'Users should now be able to add opportunities to projects!';
  RAISE NOTICE '=======================================================';
END $$;