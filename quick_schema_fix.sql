-- Quick Fix: Essential Schema Updates Only
-- Run these in Supabase SQL Editor if you want minimal changes

-- 1. Add missing columns to investors table
ALTER TABLE investors
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS focus_areas TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Add missing columns to project_opportunities table
ALTER TABLE project_opportunities
ADD COLUMN IF NOT EXISTS fit_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'saved';

-- 3. Create grant_writer_reviews table
CREATE TABLE IF NOT EXISTS grant_writer_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  ai_analysis JSONB,
  application_draft TEXT,
  status TEXT DEFAULT 'pending_review',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on the new table
ALTER TABLE grant_writer_reviews ENABLE ROW LEVEL SECURITY;

-- 5. Create basic RLS policies for grant_writer_reviews
CREATE POLICY "Users can view their own grant writer reviews" ON grant_writer_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grant writer reviews" ON grant_writer_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);