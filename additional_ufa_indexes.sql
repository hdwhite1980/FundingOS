-- Additional indexes to run AFTER the main UFA tables are created
-- Run this script only after create_missing_ufa_tables.sql has completed successfully

-- =====================================================
-- VERIFY TABLES EXIST FIRST
-- =====================================================
DO $$
BEGIN
    -- Check if required tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_sba_programs' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table ufa_sba_programs does not exist. Please run create_missing_ufa_tables.sql first.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ufa_sba_knowledge_base' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Table ufa_sba_knowledge_base does not exist. Please run create_missing_ufa_tables.sql first.';
    END IF;
    
    -- Check if active column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ufa_sba_programs' AND column_name = 'active' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Column active does not exist in ufa_sba_programs table. Please check table creation.';
    END IF;
    
    RAISE NOTICE 'All required tables and columns exist. Proceeding with index creation...';
END $$;

-- =====================================================
-- ADVANCED PERFORMANCE INDEXES
-- =====================================================

-- SBA Knowledge Base advanced indexes
CREATE INDEX IF NOT EXISTS idx_sba_knowledge_keywords ON ufa_sba_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_sba_knowledge_topics ON ufa_sba_knowledge_base USING GIN(topics);
-- Vector similarity index (HNSW algorithm for fast approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_sba_knowledge_vector ON ufa_sba_knowledge_base USING hnsw (content_vector vector_cosine_ops);

-- SBA Programs advanced indexes
CREATE INDEX IF NOT EXISTS idx_sba_programs_active ON ufa_sba_programs(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_sba_programs_industry ON ufa_sba_programs USING GIN(industry_codes);
CREATE INDEX IF NOT EXISTS idx_sba_programs_stages ON ufa_sba_programs USING GIN(business_stages);

-- Additional UFA indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ufa_analysis_tenant_date ON ufa_analysis_results(tenant_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_ufa_goals_tenant_status ON ufa_strategic_goals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ufa_notifications_tenant_unread ON ufa_notifications(tenant_id, read) WHERE read = false;

-- Verify indexes were created
SELECT 
    'ADDITIONAL INDEXES CREATED' as status,
    'Performance indexes have been added successfully' as message,
    'Your UFA system now has optimal database performance' as result;