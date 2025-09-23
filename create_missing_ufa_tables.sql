-- Create Missing UFA Tables for FundingOS
-- Run this script in Supabase if tables are missing from the validation

-- =====================================================
-- CREATE UFA ANALYSIS RESULTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ufa_analysis_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    analysis_date TIMESTAMPTZ DEFAULT NOW(),
    analysis_type TEXT NOT NULL DEFAULT 'comprehensive',
    
    -- Analysis Results
    total_opportunities INTEGER DEFAULT 0,
    high_priority_matches INTEGER DEFAULT 0,
    total_funding_potential BIGINT DEFAULT 0,
    success_probability DECIMAL(5,2) DEFAULT 0,
    
    -- Strategic Overview
    strategic_overview JSONB DEFAULT '{}',
    channel_analysis JSONB DEFAULT '{}',
    sba_intelligence JSONB DEFAULT NULL,
    
    -- AI Status
    ai_status JSONB DEFAULT '{"state": "idle", "confidence": 0}',
    
    -- Metadata
    data_quality TEXT DEFAULT 'UNKNOWN',
    enhancement_source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ufa_analysis_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can only see their own UFA analysis results"
ON ufa_analysis_results FOR ALL
USING (tenant_id::text = auth.uid()::text);

-- =====================================================
-- CREATE UFA STRATEGIC GOALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ufa_strategic_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Goal Information
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'funding', 'growth', 'compliance', 'strategic'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
    
    -- Timeline and Progress
    target_date DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Financial Impact
    funding_target BIGINT DEFAULT 0,
    investment_required BIGINT DEFAULT 0,
    potential_return BIGINT DEFAULT 0,
    success_probability DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    ai_generated BOOLEAN DEFAULT true,
    analysis_id UUID REFERENCES ufa_analysis_results(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ufa_strategic_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can only see their own strategic goals"
ON ufa_strategic_goals FOR ALL
USING (tenant_id::text = auth.uid()::text);

-- =====================================================
-- CREATE UFA NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ufa_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Notification Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'error', 'opportunity'
    category TEXT DEFAULT 'general', -- 'opportunity', 'deadline', 'analysis', 'system'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    
    -- Status
    read BOOLEAN DEFAULT false,
    dismissed BOOLEAN DEFAULT false,
    
    -- Actions
    action_url TEXT,
    action_label TEXT,
    
    -- Metadata
    source TEXT DEFAULT 'ufa_system',
    analysis_id UUID REFERENCES ufa_analysis_results(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Enable RLS
ALTER TABLE ufa_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can only see their own notifications"
ON ufa_notifications FOR ALL
USING (tenant_id::text = auth.uid()::text);

-- =====================================================
-- CREATE SBA KNOWLEDGE BASE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ufa_sba_knowledge_base (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Content Information
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'guide', -- 'guide', 'program', 'resource', 'faq'
    category TEXT, -- 'loans', 'grants', 'contracting', 'export', 'disaster'
    subcategory TEXT,
    
    -- Source Information
    source_url TEXT,
    source_date DATE,
    scraped_at TIMESTAMPTZ,
    
    -- Content Analysis
    keywords TEXT[],
    topics TEXT[],
    industry_relevance TEXT[],
    business_stage_relevance TEXT[], -- 'startup', 'early_stage', 'growth', 'mature'
    
    -- Search and Matching
    content_vector vector(1536), -- For embeddings/semantic search (requires pgvector extension)
    content_hash TEXT, -- Hash for deduplication
    
    -- Metadata
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes will be created after all tables are defined

-- =====================================================
-- CREATE SBA PROGRAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ufa_sba_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Program Information
    name TEXT NOT NULL,
    program_type TEXT NOT NULL, -- 'loan_program', 'grant_program', 'microfinance', 'investment_program'
    description TEXT,
    eligibility_criteria TEXT,
    
    -- Funding Information
    funding_amounts JSONB DEFAULT '{}', -- {"min": 0, "max": 0, "typical": 0}
    interest_rates JSONB DEFAULT '{}', -- {"min": 0, "max": 0, "typical": 0}
    terms_and_conditions TEXT,
    
    -- Application Information
    application_process TEXT,
    required_documents TEXT[],
    application_complexity INTEGER DEFAULT 3 CHECK (application_complexity >= 1 AND application_complexity <= 5),
    processing_time_days INTEGER DEFAULT 60,
    
    -- Success Factors
    success_factors TEXT[],
    common_reasons_for_rejection TEXT[],
    
    -- Matching Criteria
    industry_codes TEXT[], -- NAICS codes
    business_stages TEXT[], -- 'startup', 'early_stage', 'growth', 'mature'
    revenue_requirements JSONB DEFAULT '{}', -- {"min": 0, "max": null}
    employee_requirements JSONB DEFAULT '{}', -- {"min": 0, "max": null}
    geographic_restrictions TEXT[],
    
    -- Strategic Information
    strategic_value INTEGER DEFAULT 3 CHECK (strategic_value >= 1 AND strategic_value <= 5),
    competitive_advantage TEXT,
    
    -- Program Status
    active BOOLEAN DEFAULT true,
    deadline DATE,
    deadline_type TEXT DEFAULT 'rolling', -- 'fixed', 'rolling', 'quarterly'
    
    -- Source Information
    source_url TEXT,
    agency TEXT DEFAULT 'SBA',
    program_code TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes will be created after all tables are defined

-- =====================================================
-- CREATE SBA READINESS ASSESSMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ufa_sba_readiness_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Assessment Scores
    overall_score INTEGER DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 100),
    business_plan_score INTEGER DEFAULT 0 CHECK (business_plan_score >= 0 AND business_plan_score <= 100),
    financial_readiness_score INTEGER DEFAULT 0 CHECK (financial_readiness_score >= 0 AND financial_readiness_score <= 100),
    credit_score INTEGER DEFAULT 0,
    management_experience_score INTEGER DEFAULT 0 CHECK (management_experience_score >= 0 AND management_experience_score <= 100),
    
    -- Financial Information
    collateral_value BIGINT DEFAULT 0,
    debt_to_income_ratio DECIMAL(5,2) DEFAULT 0,
    cash_flow_positive BOOLEAN DEFAULT false,
    
    -- Business Information
    years_in_business DECIMAL(4,2) DEFAULT 0,
    business_stage TEXT DEFAULT 'early_stage',
    industry_experience INTEGER DEFAULT 0,
    
    -- Assessment Details
    strengths TEXT[],
    weaknesses TEXT[],
    recommendations TEXT[],
    improvement_areas JSONB DEFAULT '[]',
    
    -- Readiness by Program Type
    loan_program_readiness INTEGER DEFAULT 0 CHECK (loan_program_readiness >= 0 AND loan_program_readiness <= 100),
    grant_program_readiness INTEGER DEFAULT 0 CHECK (grant_program_readiness >= 0 AND grant_program_readiness <= 100),
    contracting_readiness INTEGER DEFAULT 0 CHECK (contracting_readiness >= 0 AND contracting_readiness <= 100),
    
    -- Metadata
    assessment_date TIMESTAMPTZ DEFAULT NOW(),
    assessment_method TEXT DEFAULT 'automated', -- 'automated', 'manual', 'hybrid'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ufa_sba_readiness_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can only see their own readiness assessments"
ON ufa_sba_readiness_assessments FOR ALL
USING (tenant_id::text = auth.uid()::text);

-- =====================================================
-- CREATE BASIC INDEXES FOR PERFORMANCE
-- =====================================================

-- SBA Knowledge Base indexes (basic ones only)
CREATE INDEX IF NOT EXISTS idx_sba_knowledge_category ON ufa_sba_knowledge_base(category);
-- Note: Advanced GIN and vector indexes moved to separate script due to timing issues

-- SBA Programs indexes (basic ones only)
CREATE INDEX IF NOT EXISTS idx_sba_programs_type ON ufa_sba_programs(program_type);
-- Note: GIN indexes for arrays moved to separate script due to timing issues

-- SBA Readiness Assessments indexes
CREATE INDEX IF NOT EXISTS idx_sba_readiness_tenant ON ufa_sba_readiness_assessments(tenant_id);

-- =====================================================
-- CREATE FUNCTIONS FOR AUTOMATED UPDATES
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating timestamps
CREATE TRIGGER update_ufa_analysis_results_updated_at BEFORE UPDATE ON ufa_analysis_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ufa_strategic_goals_updated_at BEFORE UPDATE ON ufa_strategic_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sba_knowledge_updated_at BEFORE UPDATE ON ufa_sba_knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sba_programs_updated_at BEFORE UPDATE ON ufa_sba_programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sba_readiness_updated_at BEFORE UPDATE ON ufa_sba_readiness_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
SELECT 
    'TABLE CREATION COMPLETE' as status,
    'All UFA and SBA Intelligence tables have been created successfully' as message,
    'Run the validation query again to verify all tables exist' as next_step;