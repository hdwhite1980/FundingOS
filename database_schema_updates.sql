-- Database Schema Updates for FundingOS
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Fix investors table schema
-- Add missing columns if they don't exist
ALTER TABLE investors
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS focus_areas TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address_line1 TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- Ensure proper constraints
ALTER TABLE investors
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN email SET NOT NULL;

-- 2. Fix project_opportunities table schema
-- Add missing columns if they don't exist
ALTER TABLE project_opportunities
ADD COLUMN IF NOT EXISTS fit_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS application_draft TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'saved';

-- Ensure proper constraints
ALTER TABLE project_opportunities
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN project_id SET NOT NULL,
ALTER COLUMN opportunity_id SET NOT NULL;

-- 3. Create grant_writer_reviews table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS grant_writer_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  ai_analysis JSONB,
  application_draft TEXT,
  status TEXT DEFAULT 'pending_review',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_investors_user_id ON investors(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_type ON investors(type);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_user_id ON project_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_project_id ON project_opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_status ON project_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_grant_writer_reviews_user_id ON grant_writer_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_writer_reviews_status ON grant_writer_reviews(status);

-- 5. Enable Row Level Security (RLS) policies
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE grant_writer_reviews ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for investors table
DROP POLICY IF EXISTS "Users can view their own investors" ON investors;
CREATE POLICY "Users can view their own investors" ON investors
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own investors" ON investors;
CREATE POLICY "Users can insert their own investors" ON investors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own investors" ON investors;
CREATE POLICY "Users can update their own investors" ON investors
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own investors" ON investors;
CREATE POLICY "Users can delete their own investors" ON investors
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create RLS policies for project_opportunities table
DROP POLICY IF EXISTS "Users can view their own project opportunities" ON project_opportunities;
CREATE POLICY "Users can view their own project opportunities" ON project_opportunities
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own project opportunities" ON project_opportunities;
CREATE POLICY "Users can insert their own project opportunities" ON project_opportunities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own project opportunities" ON project_opportunities;
CREATE POLICY "Users can update their own project opportunities" ON project_opportunities
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own project opportunities" ON project_opportunities;
CREATE POLICY "Users can delete their own project opportunities" ON project_opportunities
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Create RLS policies for grant_writer_reviews table
DROP POLICY IF EXISTS "Users can view their own grant writer reviews" ON grant_writer_reviews;
CREATE POLICY "Users can view their own grant writer reviews" ON grant_writer_reviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own grant writer reviews" ON grant_writer_reviews;
CREATE POLICY "Users can insert their own grant writer reviews" ON grant_writer_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own grant writer reviews" ON grant_writer_reviews;
CREATE POLICY "Users can update their own grant writer reviews" ON grant_writer_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- 9. Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Add updated_at triggers
DROP TRIGGER IF EXISTS update_investors_updated_at ON investors;
CREATE TRIGGER update_investors_updated_at
  BEFORE UPDATE ON investors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_opportunities_updated_at ON project_opportunities;
CREATE TRIGGER update_project_opportunities_updated_at
  BEFORE UPDATE ON project_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grant_writer_reviews_updated_at ON grant_writer_reviews;
CREATE TRIGGER update_grant_writer_reviews_updated_at
  BEFORE UPDATE ON grant_writer_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Verify the schema updates
-- You can run these queries to check if the tables are properly set up:

-- Check investors table structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'investors'
-- ORDER BY ordinal_position;

-- Check project_opportunities table structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'project_opportunities'
-- ORDER BY ordinal_position;

-- Check grant_writer_reviews table structure:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'grant_writer_reviews'
-- ORDER BY ordinal_position;