-- Enhanced AI Discovery Database Schema Updates
-- This script adds all required fields for the enhanced AI-powered opportunity discovery system
-- Run this in your Supabase SQL Editor

-- =============================================
-- SCHEMA COMPATIBILITY FIXES
-- =============================================

-- First, fix any existing fields that might have wrong data types
DO $$
DECLARE
  idx_record RECORD;
BEGIN
  RAISE NOTICE 'Starting schema compatibility fixes...';
  
  -- Check and fix eligibility_criteria if it's an array type
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='opportunities' 
             AND column_name='eligibility_criteria' 
             AND data_type LIKE '%ARRAY%') THEN
    RAISE NOTICE 'Converting eligibility_criteria from ARRAY to TEXT';
    
    -- Drop ALL indexes on eligibility_criteria column to avoid GIN operator class conflicts
    FOR idx_record IN 
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'opportunities' 
      AND (indexdef LIKE '%eligibility_criteria%' OR indexname LIKE '%eligibility%')
    LOOP
      RAISE NOTICE 'Dropping conflicting index: %', idx_record.indexname;
      EXECUTE 'DROP INDEX IF EXISTS ' || idx_record.indexname || ' CASCADE';
    END LOOP;
    
    -- Convert the column type with safe array handling
    ALTER TABLE opportunities ALTER COLUMN eligibility_criteria TYPE TEXT 
    USING CASE 
      WHEN eligibility_criteria IS NULL THEN NULL
      WHEN array_length(eligibility_criteria, 1) IS NULL THEN ''
      ELSE array_to_string(eligibility_criteria, '; ')
    END;
    
    -- Create a new text-compatible index
    CREATE INDEX IF NOT EXISTS idx_opportunities_eligibility_text 
    ON opportunities USING btree(eligibility_criteria) 
    WHERE eligibility_criteria IS NOT NULL AND eligibility_criteria != '';
    
    RAISE NOTICE 'Successfully converted eligibility_criteria to TEXT';
  END IF;
  
  -- Check and fix project_types if it's wrong type 
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='opportunities' 
             AND column_name='project_types' 
             AND data_type != 'jsonb') THEN
    RAISE NOTICE 'Converting project_types to JSONB';
    
    -- Drop any conflicting indexes
    DROP INDEX IF EXISTS idx_opportunities_project_types;
    
    -- Simple conversion - clean data should be handled by cleanup script
    ALTER TABLE opportunities ALTER COLUMN project_types TYPE JSONB USING 
      CASE 
        WHEN project_types IS NULL THEN '[]'::jsonb
        WHEN length(trim(project_types)) = 0 THEN '[]'::jsonb
        WHEN project_types = 'null' THEN '[]'::jsonb
        ELSE '[]'::jsonb  -- Default to empty array for safety
      END;
      
    RAISE NOTICE 'Successfully converted project_types to JSONB';
  END IF;
END $$;

-- =============================================
-- OPPORTUNITIES TABLE ENHANCEMENTS
-- =============================================

-- Add enhanced AI analysis fields to opportunities table
DO $$
BEGIN
  -- Geographic and location fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='geographic_restrictions') THEN
    ALTER TABLE opportunities ADD COLUMN geographic_restrictions TEXT;
  END IF;

  -- Enhanced scoring fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='relevance_score') THEN
    ALTER TABLE opportunities ADD COLUMN relevance_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='intent_alignment_score') THEN
    ALTER TABLE opportunities ADD COLUMN intent_alignment_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='confidence_level') THEN
    ALTER TABLE opportunities ADD COLUMN confidence_level NUMERIC(5,2) DEFAULT 0;
  END IF;

  -- Project matching and analysis
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='matching_projects') THEN
    ALTER TABLE opportunities ADD COLUMN matching_projects JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='project_matches') THEN
    ALTER TABLE opportunities ADD COLUMN project_matches JSONB DEFAULT '[]';
  END IF;

  -- Competitive and timeline analysis
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='competitive_analysis') THEN
    ALTER TABLE opportunities ADD COLUMN competitive_analysis JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='timeline_analysis') THEN
    ALTER TABLE opportunities ADD COLUMN timeline_analysis JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='application_priority') THEN
    ALTER TABLE opportunities ADD COLUMN application_priority TEXT CHECK (application_priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;

  -- Recommendations and actions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='recommendation_strength') THEN
    ALTER TABLE opportunities ADD COLUMN recommendation_strength TEXT CHECK (recommendation_strength IN ('weak', 'moderate', 'strong', 'excellent'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='recommended_actions') THEN
    ALTER TABLE opportunities ADD COLUMN recommended_actions JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='potential_challenges') THEN
    ALTER TABLE opportunities ADD COLUMN potential_challenges JSONB DEFAULT '[]';
  END IF;

  -- Application complexity and competition
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='application_complexity') THEN
    ALTER TABLE opportunities ADD COLUMN application_complexity TEXT CHECK (application_complexity IN ('low', 'moderate', 'high', 'very_high'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='competition_level') THEN
    ALTER TABLE opportunities ADD COLUMN competition_level TEXT CHECK (competition_level IN ('low', 'moderate', 'high', 'very_high'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='strategic_priority') THEN
    ALTER TABLE opportunities ADD COLUMN strategic_priority TEXT CHECK (strategic_priority IN ('low', 'medium', 'high', 'critical'));
  END IF;

  -- Discovery metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='discovery_method') THEN
    ALTER TABLE opportunities ADD COLUMN discovery_method TEXT DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='search_query_used') THEN
    ALTER TABLE opportunities ADD COLUMN search_query_used TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='content_extracted_at') THEN
    ALTER TABLE opportunities ADD COLUMN content_extracted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='content_length') THEN
    ALTER TABLE opportunities ADD COLUMN content_length INTEGER;
  END IF;

  -- Review and approval flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='needs_review') THEN
    ALTER TABLE opportunities ADD COLUMN needs_review BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='auto_approved') THEN
    ALTER TABLE opportunities ADD COLUMN auto_approved BOOLEAN DEFAULT FALSE;
  END IF;

  -- Enhanced status tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='discovered_at') THEN
    ALTER TABLE opportunities ADD COLUMN discovered_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='last_updated') THEN
    ALTER TABLE opportunities ADD COLUMN last_updated TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Enhanced AI analysis field (expand existing or add if missing)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='ai_analysis') THEN
    ALTER TABLE opportunities ADD COLUMN ai_analysis JSONB DEFAULT '{}';
  END IF;

  -- Add missing funding-related fields that the AI discovery system expects
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='estimated_funding') THEN
    ALTER TABLE opportunities ADD COLUMN estimated_funding NUMERIC(15,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='amount_min') THEN
    ALTER TABLE opportunities ADD COLUMN amount_min NUMERIC(15,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='amount_max') THEN
    ALTER TABLE opportunities ADD COLUMN amount_max NUMERIC(15,2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='deadline_date') THEN
    ALTER TABLE opportunities ADD COLUMN deadline_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='eligibility_criteria') THEN
    ALTER TABLE opportunities ADD COLUMN eligibility_criteria TEXT;
  ELSE
    -- Check if the existing eligibility_criteria is an array type and convert it to TEXT
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='eligibility_criteria' AND data_type LIKE '%ARRAY%') THEN
      -- Convert array column to TEXT
      ALTER TABLE opportunities ALTER COLUMN eligibility_criteria TYPE TEXT USING array_to_string(eligibility_criteria, '; ');
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='application_requirements') THEN
    ALTER TABLE opportunities ADD COLUMN application_requirements TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='project_types') THEN
    ALTER TABLE opportunities ADD COLUMN project_types JSONB DEFAULT '[]';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='source_url') THEN
    ALTER TABLE opportunities ADD COLUMN source_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='fit_score') THEN
    ALTER TABLE opportunities ADD COLUMN fit_score NUMERIC(5,2) DEFAULT 0;
  END IF;

  -- Add status field that the AI discovery system expects
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='status') THEN
    ALTER TABLE opportunities ADD COLUMN status TEXT DEFAULT 'discovered' CHECK (status IN ('discovered', 'active', 'saved', 'applied', 'rejected', 'closed', 'draft'));
  END IF;

  RAISE NOTICE 'Enhanced AI discovery fields added to opportunities table';
END $$;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Scoring and priority indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_relevance_score ON opportunities(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_intent_alignment_score ON opportunities(intent_alignment_score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_confidence_level ON opportunities(confidence_level DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_application_priority ON opportunities(application_priority);

-- Status and review indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_needs_review ON opportunities(needs_review) WHERE needs_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_opportunities_auto_approved ON opportunities(auto_approved) WHERE auto_approved = TRUE;
CREATE INDEX IF NOT EXISTS idx_opportunities_discovery_method ON opportunities(discovery_method);

-- Date and timeline indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_discovered_at ON opportunities(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_content_extracted_at ON opportunities(content_extracted_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_last_updated ON opportunities(last_updated DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_opportunities_priority_score ON opportunities(application_priority, relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_review_status ON opportunities(needs_review, auto_approved, discovered_at DESC);

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS idx_opportunities_ai_analysis_gin ON opportunities USING GIN(ai_analysis);
CREATE INDEX IF NOT EXISTS idx_opportunities_matching_projects_gin ON opportunities USING GIN(matching_projects);
CREATE INDEX IF NOT EXISTS idx_opportunities_competitive_analysis_gin ON opportunities USING GIN(competitive_analysis);
CREATE INDEX IF NOT EXISTS idx_opportunities_recommended_actions_gin ON opportunities USING GIN(recommended_actions);
CREATE INDEX IF NOT EXISTS idx_opportunities_project_types_gin ON opportunities USING GIN(project_types);

-- Text search indexes (for TEXT fields)
CREATE INDEX IF NOT EXISTS idx_opportunities_eligibility_text ON opportunities USING btree(eligibility_criteria) WHERE eligibility_criteria IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_description_text ON opportunities USING btree(description) WHERE description IS NOT NULL;

-- Funding and deadline indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_estimated_funding ON opportunities(estimated_funding DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_amount_range ON opportunities(amount_min, amount_max);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline_date ON opportunities(deadline_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_fit_score ON opportunities(fit_score DESC);

-- URL and source tracking indexes  
CREATE INDEX IF NOT EXISTS idx_opportunities_source_url ON opportunities(source_url);
CREATE INDEX IF NOT EXISTS idx_opportunities_source_url_hash ON opportunities(md5(source_url)) WHERE source_url IS NOT NULL;

-- Status and workflow indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_status_updated ON opportunities(status, last_updated DESC);

-- =============================================
-- CREATE WEB SCRAPING SESSION TRACKING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS web_scraping_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  search_query TEXT NOT NULL,
  search_intent JSONB,
  total_opportunities_found INTEGER DEFAULT 0,
  high_priority_opportunities INTEGER DEFAULT 0,
  session_started_at TIMESTAMPTZ DEFAULT NOW(),
  session_completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  session_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for web scraping sessions
CREATE INDEX IF NOT EXISTS idx_web_scraping_sessions_user_id ON web_scraping_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_web_scraping_sessions_status ON web_scraping_sessions(status);
CREATE INDEX IF NOT EXISTS idx_web_scraping_sessions_started_at ON web_scraping_sessions(session_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_scraping_sessions_session_id ON web_scraping_sessions(session_id);

-- Enable RLS for web scraping sessions
ALTER TABLE web_scraping_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for web scraping sessions
DROP POLICY IF EXISTS "Users can view their own scraping sessions" ON web_scraping_sessions;
CREATE POLICY "Users can view their own scraping sessions" ON web_scraping_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own scraping sessions" ON web_scraping_sessions;
CREATE POLICY "Users can insert their own scraping sessions" ON web_scraping_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own scraping sessions" ON web_scraping_sessions;
CREATE POLICY "Users can update their own scraping sessions" ON web_scraping_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- CREATE AI SEARCH ANALYTICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS ai_search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_intent TEXT,
  extracted_keywords JSONB DEFAULT '[]',
  enhanced_search_terms JSONB DEFAULT '[]',
  total_results_found INTEGER DEFAULT 0,
  relevant_results_count INTEGER DEFAULT 0,
  average_relevance_score NUMERIC(5,2) DEFAULT 0,
  high_priority_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  api_calls_made INTEGER DEFAULT 0,
  search_timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for search analytics
CREATE INDEX IF NOT EXISTS idx_ai_search_analytics_user_id ON ai_search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_search_analytics_search_timestamp ON ai_search_analytics(search_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_search_analytics_intent ON ai_search_analytics(search_intent);
CREATE INDEX IF NOT EXISTS idx_ai_search_analytics_relevance_score ON ai_search_analytics(average_relevance_score DESC);

-- Enable RLS for search analytics
ALTER TABLE ai_search_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for search analytics
DROP POLICY IF EXISTS "Users can view their own search analytics" ON ai_search_analytics;
CREATE POLICY "Users can view their own search analytics" ON ai_search_analytics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own search analytics" ON ai_search_analytics;
CREATE POLICY "Users can insert their own search analytics" ON ai_search_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- CREATE UPDATED_AT TRIGGER FOR NEW TABLES
-- =============================================

-- Add updated_at trigger for web_scraping_sessions
DROP TRIGGER IF EXISTS update_web_scraping_sessions_updated_at ON web_scraping_sessions;
CREATE TRIGGER update_web_scraping_sessions_updated_at
  BEFORE UPDATE ON web_scraping_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for opportunities (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_opportunities_updated_at') THEN
    CREATE TRIGGER update_opportunities_updated_at
      BEFORE UPDATE ON opportunities
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- You can run these queries after the migration to verify everything worked:

-- Check new opportunities columns
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'opportunities' 
-- AND column_name IN ('geographic_restrictions', 'intent_alignment_score', 'competitive_analysis', 'application_priority', 'estimated_funding', 'fit_score', 'status')
-- ORDER BY column_name;

-- Check new tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('web_scraping_sessions', 'ai_search_analytics');

-- Check indexes were created
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'opportunities' 
-- AND indexname LIKE 'idx_opportunities_%';

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Enhanced AI Discovery Database Update Complete!';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Enhanced opportunities table with:';
  RAISE NOTICE '- 20+ new AI analysis fields';
  RAISE NOTICE '- Enhanced scoring and matching capabilities';
  RAISE NOTICE '- Competitive analysis and timeline tracking';
  RAISE NOTICE '- Discovery metadata and review flags';
  RAISE NOTICE '';
  RAISE NOTICE 'New tables created:';
  RAISE NOTICE '- web_scraping_sessions (session tracking)';
  RAISE NOTICE '- ai_search_analytics (search performance)';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance optimizations:';
  RAISE NOTICE '- 15+ new indexes for fast queries';
  RAISE NOTICE '- GIN indexes for JSONB field searches';
  RAISE NOTICE '- Composite indexes for common patterns';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '- RLS policies enabled for all new tables';
  RAISE NOTICE '- Proper user isolation maintained';
  RAISE NOTICE '';
  RAISE NOTICE 'Your database is now ready for enhanced AI discovery!';
  RAISE NOTICE '========================================================';
END $$;