-- Database setup for scoring cache invalidation system
-- Run this to ensure your database works with the new scoring cache features

-- 1. Ensure project_opportunities table has all required columns
ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS project_id UUID;

ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS opportunity_id UUID;

ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS fit_score DECIMAL(5,2) DEFAULT 0;

ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'needs_scoring';

ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS score_calculated_at TIMESTAMPTZ;

ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE project_opportunities 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create unique constraint for caching (prevents duplicates)
ALTER TABLE project_opportunities 
ADD CONSTRAINT unique_user_project_opportunity 
UNIQUE (user_id, project_id, opportunity_id);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_opportunities_user_id ON project_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_project_id ON project_opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_opportunity_id ON project_opportunities(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_fit_score ON project_opportunities(fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_status ON project_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_score_calculated_at ON project_opportunities(score_calculated_at);

-- 4. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_project_opportunities_updated_at ON project_opportunities;
CREATE TRIGGER update_project_opportunities_updated_at
    BEFORE UPDATE ON project_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Ensure profiles table has fields needed for smart invalidation
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_type TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_name TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS small_business BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS woman_owned BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS minority_owned BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS veteran_owned BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS annual_revenue DECIMAL(15,2);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS employee_count INTEGER;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS geographic_location TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS service_area TEXT[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS years_operating INTEGER;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS incorporation_year INTEGER;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS certifications TEXT[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS registrations TEXT[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS core_capabilities TEXT[];

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS past_experience TEXT;

-- 6. Ensure projects table has fields needed for smart invalidation
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_category TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS funding_request_amount DECIMAL(15,2);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS total_project_budget DECIMAL(15,2);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS funding_needed DECIMAL(15,2);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS target_population TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS target_population_description TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS primary_goals TEXT[];

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS expected_outcomes TEXT[];

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS outcome_measures TEXT[];

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS unique_innovation TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS innovation_description TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS methodology TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS approach TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS current_status TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS timeline TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS geographic_location TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS service_area TEXT[];

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS partnership_approach TEXT;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS matching_funds_available BOOLEAN DEFAULT FALSE;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS proposed_start_date DATE;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS funding_decision_needed DATE;

-- 7. Add RLS policies for project_opportunities table
ALTER TABLE project_opportunities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own project opportunities
CREATE POLICY "Users can view own project opportunities" ON project_opportunities
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own project opportunities  
CREATE POLICY "Users can insert own project opportunities" ON project_opportunities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own project opportunities
CREATE POLICY "Users can update own project opportunities" ON project_opportunities
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own project opportunities
CREATE POLICY "Users can delete own project opportunities" ON project_opportunities
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Grant service role access for cache management
GRANT ALL ON project_opportunities TO service_role;

-- 9. Create function to clean up old cached scores (for cron job)
CREATE OR REPLACE FUNCTION cleanup_old_scores(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM project_opportunities 
    WHERE score_calculated_at < NOW() - INTERVAL '1 day' * days_old
    AND status = 'scored';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Verify the setup
SELECT 'project_opportunities' as table_name, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'project_opportunities'
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'profiles'
UNION ALL  
SELECT 'projects' as table_name, COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'projects';

-- Show the project_opportunities table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'project_opportunities'
ORDER BY ordinal_position;

-- Show constraints
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'project_opportunities'::regclass;

-- Show indexes  
SELECT indexname, indexdef
FROM pg_indexes 
WHERE tablename = 'project_opportunities';

COMMENT ON TABLE project_opportunities IS 'Cached scoring data for project-opportunity matches with smart invalidation support';
COMMENT ON COLUMN project_opportunities.fit_score IS 'AI-calculated fit score (0-100)';
COMMENT ON COLUMN project_opportunities.ai_analysis IS 'Complete AI analysis data including scoring breakdown';
COMMENT ON COLUMN project_opportunities.status IS 'Scoring status: needs_scoring, scored, error';
COMMENT ON COLUMN project_opportunities.score_calculated_at IS 'When the score was last calculated - NULL means needs recalculation';