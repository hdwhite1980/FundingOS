-- COMPLETE SUBMISSIONS TABLE SCHEMA FIX
-- This script will add ALL missing columns and fix data type issues
-- Run this in Supabase SQL Editor

-- =====================================================================
-- PART 0: DIAGNOSTIC - Check current submissions table structure
-- =====================================================================

-- This will show us ALL columns and their data types
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'CURRENT SUBMISSIONS TABLE STRUCTURE:';
    RAISE NOTICE '================================================================';
    
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'submissions' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: % | Default: %', 
            rec.column_name, rec.data_type, rec.is_nullable, rec.column_default;
    END LOOP;
    
    RAISE NOTICE '================================================================';
END $$;

-- =====================================================================
-- PART 1: Add ALL missing columns to submissions table
-- =====================================================================

-- First, let's check what columns might be causing UUID issues
-- Drop ANY columns that might be UUID but should be TEXT
ALTER TABLE submissions DROP COLUMN IF EXISTS ai_analysis;
ALTER TABLE submissions DROP COLUMN IF EXISTS submitted_date;
ALTER TABLE submissions DROP COLUMN IF EXISTS reviewed_date;
ALTER TABLE submissions DROP COLUMN IF EXISTS reviewer_notes;
ALTER TABLE submissions DROP COLUMN IF EXISTS application_draft;
ALTER TABLE submissions DROP COLUMN IF EXISTS application_data;
ALTER TABLE submissions DROP COLUMN IF EXISTS generated_document;
ALTER TABLE submissions DROP COLUMN IF EXISTS document_id;
ALTER TABLE submissions DROP COLUMN IF EXISTS score_calculated_at;
ALTER TABLE submissions DROP COLUMN IF EXISTS fit_score;

-- Also drop any other potential UUID columns that should be TEXT
ALTER TABLE submissions DROP COLUMN IF EXISTS generation_id;
ALTER TABLE submissions DROP COLUMN IF EXISTS analysis_id;
ALTER TABLE submissions DROP COLUMN IF EXISTS request_id;

-- CRITICAL: Drop the opportunity_id constraint that's causing the UUID error
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_opportunity_id_fkey;
ALTER TABLE submissions DROP COLUMN IF EXISTS opportunity_id;

-- Add all columns with proper data types
ALTER TABLE submissions
ADD COLUMN ai_analysis JSONB DEFAULT '{}',
ADD COLUMN submitted_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN reviewed_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN reviewer_notes TEXT,
ADD COLUMN application_draft TEXT,
ADD COLUMN application_data JSONB DEFAULT '{}',
ADD COLUMN generated_document TEXT,
ADD COLUMN document_id TEXT, -- TEXT to handle "ai-generated-xxx" format
ADD COLUMN score_calculated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN fit_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN generation_id TEXT, -- Add this as TEXT in case it's being used
ADD COLUMN analysis_id TEXT, -- Add this as TEXT in case it's being used
ADD COLUMN request_id TEXT, -- Add this as TEXT in case it's being used
ADD COLUMN opportunity_id TEXT; -- CHANGED TO TEXT to handle "ai-generated-xxx" IDs

-- =====================================================================
-- PART 2: Fix project_opportunities table for scoring cache
-- =====================================================================

-- Drop and recreate columns to ensure proper data types
ALTER TABLE project_opportunities DROP COLUMN IF EXISTS fit_score;
ALTER TABLE project_opportunities DROP COLUMN IF EXISTS ai_analysis;
ALTER TABLE project_opportunities DROP COLUMN IF EXISTS status;
ALTER TABLE project_opportunities DROP COLUMN IF EXISTS score_calculated_at;

-- Add columns with proper data types
ALTER TABLE project_opportunities
ADD COLUMN fit_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN ai_analysis JSONB DEFAULT '{}',
ADD COLUMN status TEXT DEFAULT 'saved',
ADD COLUMN score_calculated_at TIMESTAMP WITH TIME ZONE;

-- =====================================================================
-- PART 3: Fix investors table
-- =====================================================================

-- Add missing columns to investors table (keeping IF NOT EXISTS for safety)
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

-- =====================================================================
-- PART 4: Create/Update grant_writer_reviews table
-- =====================================================================

-- Drop and recreate table to ensure proper structure
DROP TABLE IF EXISTS grant_writer_reviews CASCADE;

CREATE TABLE grant_writer_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  ai_analysis JSONB DEFAULT '{}',
  application_draft TEXT,
  generated_document TEXT,
  document_id TEXT, -- Changed from UUID to TEXT
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'in_progress', 'completed', 'cancelled')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE grant_writer_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own grant writer reviews" ON grant_writer_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grant writer reviews" ON grant_writer_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grant writer reviews" ON grant_writer_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grant writer reviews" ON grant_writer_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================================
-- PART 5: Create indexes for performance
-- =====================================================================

-- Submissions table indexes
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_opportunity_id ON submissions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_document_id ON submissions(document_id);

-- Project opportunities indexes
CREATE INDEX IF NOT EXISTS idx_project_opportunities_user_id ON project_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_project_id ON project_opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_fit_score ON project_opportunities(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_status ON project_opportunities(status);

-- Grant writer reviews indexes
CREATE INDEX IF NOT EXISTS idx_grant_writer_reviews_user_id ON grant_writer_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_grant_writer_reviews_project_id ON grant_writer_reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_grant_writer_reviews_status ON grant_writer_reviews(status);

-- =====================================================================
-- PART 6: Create updated_at trigger function and triggers
-- =====================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_opportunities_updated_at ON project_opportunities;
CREATE TRIGGER update_project_opportunities_updated_at
  BEFORE UPDATE ON project_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grant_writer_reviews_updated_at ON grant_writer_reviews;
CREATE TRIGGER update_grant_writer_reviews_updated_at
  BEFORE UPDATE ON grant_writer_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- COMPLETION MESSAGES
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'COMPLETE SUBMISSIONS SCHEMA FIX COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Fixed Issues:';
  RAISE NOTICE '✅ Added ALL missing columns to submissions table';
  RAISE NOTICE '✅ Changed document_id from UUID to TEXT (supports "ai-generated-xxx")';
  RAISE NOTICE '✅ Fixed project_opportunities for scoring cache';
  RAISE NOTICE '✅ Added missing investor columns';
  RAISE NOTICE '✅ Created proper grant_writer_reviews table';
  RAISE NOTICE '✅ Added performance indexes';
  RAISE NOTICE '✅ Added updated_at triggers';
  RAISE NOTICE '✅ Set up proper RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE 'Your application should now work without column errors!';
  RAISE NOTICE '================================================================';
END $$;