-- FundingOS Database Updates
-- This file contains SQL commands to update your Supabase database with new tables and columns
-- for the unified AI agent system and enhanced functionality

-- ======================================================================
-- 1. NEW AI AGENT TABLES
-- ======================================================================

-- Agent status tracking table
CREATE TABLE IF NOT EXISTS agent_status (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'stopped', 'error', 'starting', 'stopping')),
  last_heartbeat TIMESTAMPTZ,
  performance_metrics JSONB DEFAULT '{}',
  error_message TEXT,
  agent_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Agent errors and logging
CREATE TABLE IF NOT EXISTS agent_errors (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info')),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent conversations for chat functionality
CREATE TABLE IF NOT EXISTS agent_conversations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent experiences and learning
CREATE TABLE IF NOT EXISTS agent_experiences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_type TEXT NOT NULL,
  context JSONB NOT NULL,
  outcome TEXT NOT NULL,
  success BOOLEAN DEFAULT FALSE,
  lessons_learned JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent decisions and feedback
CREATE TABLE IF NOT EXISTS agent_decision_feedback (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'neutral')),
  feedback_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent notifications
CREATE TABLE IF NOT EXISTS agent_notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System metrics for monitoring
CREATE TABLE IF NOT EXISTS system_metrics (
  id SERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value NUMERIC,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================================
-- 2. ENHANCED EXISTING TABLES
-- ======================================================================

-- Update user_profiles table with new columns if they don't exist
DO $$
BEGIN
  -- Add organization_types array for better filtering
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='organization_types') THEN
    ALTER TABLE user_profiles ADD COLUMN organization_types TEXT[] DEFAULT '{}';
    -- Populate the new column with existing organization_type values
    UPDATE user_profiles SET organization_types = ARRAY[organization_type] WHERE organization_type IS NOT NULL;
  END IF;
  
  -- Add preferences for AI agent
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='ai_preferences') THEN
    ALTER TABLE user_profiles ADD COLUMN ai_preferences JSONB DEFAULT '{}';
  END IF;
  
  -- Add notification preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='notification_preferences') THEN
    ALTER TABLE user_profiles ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "app": true, "sms": false}';
  END IF;
END $$;

-- Update projects table with investment-related columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='seeking_investment') THEN
    ALTER TABLE projects ADD COLUMN seeking_investment BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='minimum_investment') THEN
    ALTER TABLE projects ADD COLUMN minimum_investment NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='maximum_investment') THEN
    ALTER TABLE projects ADD COLUMN maximum_investment NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='funding_stage') THEN
    ALTER TABLE projects ADD COLUMN funding_stage TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='investment_deadline') THEN
    ALTER TABLE projects ADD COLUMN investment_deadline DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='highlights') THEN
    ALTER TABLE projects ADD COLUMN highlights TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='pitch_deck_url') THEN
    ALTER TABLE projects ADD COLUMN pitch_deck_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='amount_raised') THEN
    ALTER TABLE projects ADD COLUMN amount_raised NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Add company_id column after companies table is created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='company_id') THEN
    ALTER TABLE projects ADD COLUMN company_id UUID;
  END IF;
END $$;

-- Update opportunities table structure if needed
DO $$
BEGIN
  -- Ensure organization_types column exists as array
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='organization_types') THEN
    ALTER TABLE opportunities ADD COLUMN organization_types TEXT[] DEFAULT '{}';
  END IF;
  
  -- Add AI categorization fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='ai_categories') THEN
    ALTER TABLE opportunities ADD COLUMN ai_categories TEXT[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='ai_confidence_score') THEN
    ALTER TABLE opportunities ADD COLUMN ai_confidence_score NUMERIC DEFAULT 0;
  END IF;
  
  -- Add source tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='source_system') THEN
    ALTER TABLE opportunities ADD COLUMN source_system TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='last_synced') THEN
    ALTER TABLE opportunities ADD COLUMN last_synced TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Update project_opportunities table to include user_id and timestamps
DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_opportunities' AND column_name='user_id') THEN
    -- Check if project_opportunities table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='project_opportunities') THEN
      -- First add the column as nullable
      ALTER TABLE project_opportunities ADD COLUMN user_id UUID;
      
      -- Update existing records with user_id from the related project (only if projects table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='projects') THEN
        UPDATE project_opportunities 
        SET user_id = p.user_id 
        FROM projects p 
        WHERE project_opportunities.project_id = p.id 
        AND project_opportunities.user_id IS NULL;
      END IF;
      
      -- Only set NOT NULL if we have data or if this is a fresh install
      IF (SELECT COUNT(*) FROM project_opportunities WHERE user_id IS NULL) = 0 THEN
        ALTER TABLE project_opportunities ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE project_opportunities ADD CONSTRAINT project_opportunities_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
      END IF;
    END IF;
  END IF;
  
  -- Add timestamp columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='project_opportunities') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_opportunities' AND column_name='created_at') THEN
      ALTER TABLE project_opportunities ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='project_opportunities' AND column_name='updated_at') THEN
      ALTER TABLE project_opportunities ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- ======================================================================
-- 3. ANGEL INVESTOR SYSTEM TABLES
-- ======================================================================

-- Angel investors table
CREATE TABLE IF NOT EXISTS angel_investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  title TEXT,
  bio TEXT,
  website TEXT,
  linkedin_url TEXT,
  location TEXT,
  accredited_status BOOLEAN DEFAULT FALSE,
  investment_preferences JSONB DEFAULT '{}',
  total_invested NUMERIC DEFAULT 0,
  portfolio_value NUMERIC DEFAULT 0,
  active_investments INTEGER DEFAULT 0,
  core_completed BOOLEAN DEFAULT FALSE,
  preferences_completed BOOLEAN DEFAULT FALSE,
  enhancement_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investment opportunities table
CREATE TABLE IF NOT EXISTS investment_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  pitch_summary TEXT,
  funding_goal NUMERIC NOT NULL,
  minimum_investment NUMERIC NOT NULL DEFAULT 1000,
  maximum_investment NUMERIC,
  funding_stage TEXT,
  industry TEXT,
  location TEXT,
  team_size INTEGER,
  founded_date DATE,
  website TEXT,
  pitch_deck_url TEXT,
  demo_url TEXT,
  featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'funded', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Angel investments tracking
CREATE TABLE IF NOT EXISTS angel_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES angel_investors(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  investment_amount NUMERIC NOT NULL,
  investment_type TEXT DEFAULT 'equity' CHECK (investment_type IN ('equity', 'debt', 'convertible', 'safe')),
  equity_percentage NUMERIC,
  valuation NUMERIC,
  investment_date DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'exited', 'written_off')),
  current_value NUMERIC,
  roi_percentage NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================================
-- 4. COMPANIES AND PORTFOLIO MANAGEMENT
-- ======================================================================

-- Companies table for portfolio management
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  stage TEXT,
  founded_date DATE,
  location TEXT,
  website TEXT,
  logo_url TEXT,
  team_size INTEGER,
  revenue NUMERIC DEFAULT 0,
  seeking_investment BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio overview view for companies (will be created after companies table)
-- This is handled later in the script to avoid column reference issues

-- Add foreign key constraint to projects.company_id after companies table exists
DO $$
BEGIN
  -- Check if the foreign key constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'projects' 
    AND constraint_name = 'projects_company_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE projects 
    ADD CONSTRAINT projects_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ======================================================================
-- 5. ENHANCED TRACKING TABLES
-- ======================================================================

-- Update donations table if columns don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='donation_date') THEN
    ALTER TABLE donations ADD COLUMN donation_date DATE DEFAULT CURRENT_DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='payment_method') THEN
    ALTER TABLE donations ADD COLUMN payment_method TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='transaction_id') THEN
    ALTER TABLE donations ADD COLUMN transaction_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donations' AND column_name='notes') THEN
    ALTER TABLE donations ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Update donors table if columns don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donors' AND column_name='donor_type') THEN
    ALTER TABLE donors ADD COLUMN donor_type TEXT DEFAULT 'individual';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donors' AND column_name='total_donated') THEN
    ALTER TABLE donors ADD COLUMN total_donated NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donors' AND column_name='donation_count') THEN
    ALTER TABLE donors ADD COLUMN donation_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donors' AND column_name='last_donation_date') THEN
    ALTER TABLE donors ADD COLUMN last_donation_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='donors' AND column_name='is_major_donor') THEN
    ALTER TABLE donors ADD COLUMN is_major_donor BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Update submissions table if columns don't exist (assuming this is your applications table)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='submitted_amount') THEN
    ALTER TABLE submissions ADD COLUMN submitted_amount NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='awarded_amount') THEN
    ALTER TABLE submissions ADD COLUMN awarded_amount NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='project_id') THEN
    ALTER TABLE submissions ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='submissions' AND column_name='opportunity_id') THEN
    ALTER TABLE submissions ADD COLUMN opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ======================================================================
-- 6. INDEXES FOR PERFORMANCE
-- ======================================================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_status_user_id ON agent_status(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_errors_user_id ON agent_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_experiences_user_id ON agent_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_user_id ON agent_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_notifications_read ON agent_notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_angel_investors_user_id ON angel_investors(user_id);
CREATE INDEX IF NOT EXISTS idx_angel_investments_investor_id ON angel_investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_angel_investments_project_id ON angel_investments(project_id);

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

CREATE INDEX IF NOT EXISTS idx_opportunities_organization_types ON opportunities USING GIN(organization_types);
CREATE INDEX IF NOT EXISTS idx_opportunities_ai_categories ON opportunities USING GIN(ai_categories);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_user_id ON project_opportunities(user_id);

-- ======================================================================
-- 7. TRIGGER FUNCTIONS FOR AUTOMATIC UPDATES
-- ======================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply timestamp triggers to relevant tables (with error handling)
DO $$
BEGIN
  -- Only create triggers if they don't already exist
  
  -- user_profiles trigger
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_user_profiles_updated_at') THEN
    CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- projects trigger
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_projects_updated_at') THEN
    CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- agent_status trigger
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_agent_status_updated_at') THEN
    CREATE TRIGGER update_agent_status_updated_at BEFORE UPDATE ON agent_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- angel_investors trigger
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_angel_investors_updated_at') THEN
    CREATE TRIGGER update_angel_investors_updated_at BEFORE UPDATE ON angel_investors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  -- companies trigger
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_companies_updated_at') THEN
    CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
END $$;

-- ======================================================================
-- CREATE VIEWS AFTER ALL TABLES ARE READY
-- ======================================================================

-- Portfolio overview view for companies (created after all table modifications)
DROP VIEW IF EXISTS company_portfolio_overview CASCADE;

-- Create view with dynamic column selection based on what exists
DO $$
DECLARE
    view_sql TEXT;
BEGIN
    -- Build the view SQL dynamically based on existing columns
    view_sql := 'CREATE VIEW company_portfolio_overview AS SELECT ';
    
    -- Add columns that definitely exist
    view_sql := view_sql || 'c.id, c.user_id, c.name, c.created_at, c.updated_at, ';
    
    -- Add optional columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='description') THEN
        view_sql := view_sql || 'c.description, ';
    ELSE
        view_sql := view_sql || 'NULL as description, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='industry') THEN
        view_sql := view_sql || 'c.industry, ';
    ELSE
        view_sql := view_sql || 'NULL as industry, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='stage') THEN
        view_sql := view_sql || 'c.stage, ';
    ELSE
        view_sql := view_sql || 'NULL as stage, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='founded_date') THEN
        view_sql := view_sql || 'c.founded_date, ';
    ELSE
        view_sql := view_sql || 'NULL as founded_date, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='location') THEN
        view_sql := view_sql || 'c.location, ';
    ELSE
        view_sql := view_sql || 'NULL as location, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='website') THEN
        view_sql := view_sql || 'c.website, ';
    ELSE
        view_sql := view_sql || 'NULL as website, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='logo_url') THEN
        view_sql := view_sql || 'c.logo_url, ';
    ELSE
        view_sql := view_sql || 'NULL as logo_url, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='team_size') THEN
        view_sql := view_sql || 'c.team_size, ';
    ELSE
        view_sql := view_sql || 'NULL as team_size, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='revenue') THEN
        view_sql := view_sql || 'c.revenue, ';
    ELSE
        view_sql := view_sql || '0 as revenue, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='seeking_investment') THEN
        view_sql := view_sql || 'c.seeking_investment, ';
    ELSE
        view_sql := view_sql || 'FALSE as seeking_investment, ';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='featured') THEN
        view_sql := view_sql || 'c.featured, ';
    ELSE
        view_sql := view_sql || 'FALSE as featured, ';
    END IF;
    
    -- Add aggregated columns
    view_sql := view_sql || 'COUNT(p.id) as project_count, ';
    view_sql := view_sql || 'COALESCE(SUM(p.funding_goal), 0) as total_funding_goal, ';
    view_sql := view_sql || 'COALESCE(SUM(p.amount_raised), 0) as total_amount_raised ';
    
    -- Add FROM and GROUP BY clauses
    view_sql := view_sql || 'FROM companies c ';
    view_sql := view_sql || 'LEFT JOIN projects p ON c.id = p.company_id ';
    view_sql := view_sql || 'GROUP BY c.id';
    
    -- Execute the dynamic SQL
    EXECUTE view_sql;
    
END $$;

-- ======================================================================
-- 8. SAMPLE DATA POPULATION (OPTIONAL)
-- ======================================================================

-- Insert some sample investment opportunities (optional - only if table is empty)
DO $$
BEGIN
  -- Only insert sample data if the table is empty
  IF (SELECT COUNT(*) FROM investment_opportunities) = 0 THEN
    INSERT INTO investment_opportunities (name, description, funding_goal, minimum_investment, funding_stage, industry, featured)
    VALUES 
      ('EcoTech Solutions', 'Sustainable technology for clean energy storage', 500000, 5000, 'seed', 'CleanTech', true),
      ('HealthAI Platform', 'AI-powered healthcare diagnostics platform', 1000000, 10000, 'series_a', 'Healthcare', true),
      ('FinanceFlow', 'Automated financial planning for small businesses', 250000, 2500, 'pre_seed', 'FinTech', false);
  END IF;
END $$;

-- ======================================================================
-- COMPLETION MESSAGE
-- ======================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'FundingOS Database Update Complete!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'New tables created:';
  RAISE NOTICE '- agent_status, agent_errors, agent_conversations';
  RAISE NOTICE '- agent_experiences, agent_decision_feedback';
  RAISE NOTICE '- agent_notifications, system_metrics';
  RAISE NOTICE '- angel_investors, investment_opportunities';
  RAISE NOTICE '- angel_investments, companies';
  RAISE NOTICE '';
  RAISE NOTICE 'Enhanced existing tables with new columns:';
  RAISE NOTICE '- user_profiles, projects, opportunities';
  RAISE NOTICE '- project_opportunities, donations, donors, submissions';
  RAISE NOTICE '';
  RAISE NOTICE 'All indexes and triggers have been created.';
  RAISE NOTICE 'Your unified AI agent system is ready to use!';
  RAISE NOTICE '=======================================================';
END $$;