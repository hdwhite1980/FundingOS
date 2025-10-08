-- Create comprehensive compliance tables for FundingOS
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: COMPLIANCE TRACKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  compliance_type VARCHAR(100) NOT NULL, -- 'grant_reporting', 'tax_filing', 'audit_preparation', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  deadline_date TIMESTAMP WITH TIME ZONE,
  reminder_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  assigned_to VARCHAR(255),
  estimated_hours INTEGER,
  actual_hours INTEGER,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 2: COMPLIANCE DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- 'financial_report', '990_form', 'audit_documentation', etc.
  document_name VARCHAR(255) NOT NULL,
  document_url TEXT,
  is_required BOOLEAN DEFAULT false,
  expiration_date TIMESTAMP WITH TIME ZONE,
  upload_date TIMESTAMP WITH TIME ZONE,
  file_size INTEGER,
  file_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'missing', -- 'missing', 'uploaded', 'verified', 'expired'
  verification_date TIMESTAMP WITH TIME ZONE,
  verified_by VARCHAR(255),
  compliance_tracking_id UUID REFERENCES public.compliance_tracking(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 3: COMPLIANCE RECURRING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  compliance_type VARCHAR(100) NOT NULL,
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'annually'
  frequency_interval INTEGER DEFAULT 1, -- Every X frequency units
  next_due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_completed_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  auto_create_tasks BOOLEAN DEFAULT true,
  reminder_days INTEGER DEFAULT 7,
  template_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 4: COMPLIANCE HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  overall_status VARCHAR(50) NOT NULL, -- 'good', 'warning', 'critical', 'error'
  compliance_score INTEGER DEFAULT 0, -- 0-100
  checks_performed JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  alerts_generated JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 5: COMPLIANCE PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_thresholds JSONB DEFAULT '{"critical": 7, "warning": 14, "info": 30}',
  notification_preferences JSONB DEFAULT '{"email": true, "app": true, "sms": false}',
  auto_scheduling BOOLEAN DEFAULT true,
  default_reminder_days INTEGER DEFAULT 7,
  timezone VARCHAR(50) DEFAULT 'UTC',
  business_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00", "days": [1,2,3,4,5]}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- PART 6: COMPLIANCE RULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL, -- 'deadline', 'document', 'recurring', 'conditional'
  frequency VARCHAR(50), -- For recurring rules
  deadline_offset INTEGER DEFAULT 30, -- Days before deadline to alert
  required_documents TEXT[],
  conditions JSONB DEFAULT '{}',
  is_critical BOOLEAN DEFAULT false,
  applies_to TEXT[], -- Organization types this rule applies to
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 7: COMPLIANCE ALERTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  alert_data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- PART 8: COMPLIANCE ANALYTICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.compliance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  report_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  report_data JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 9: INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_compliance_tracking_user_id ON public.compliance_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_status ON public.compliance_tracking(status);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_deadline ON public.compliance_tracking(deadline_date);
CREATE INDEX IF NOT EXISTS idx_compliance_tracking_type ON public.compliance_tracking(compliance_type);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_user_id ON public.compliance_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_type ON public.compliance_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_status ON public.compliance_documents(status);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_expiration ON public.compliance_documents(expiration_date);

CREATE INDEX IF NOT EXISTS idx_compliance_recurring_user_id ON public.compliance_recurring(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_recurring_next_due ON public.compliance_recurring(next_due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_recurring_active ON public.compliance_recurring(is_active);

CREATE INDEX IF NOT EXISTS idx_compliance_history_user_id ON public.compliance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_history_check_date ON public.compliance_history(check_date);
CREATE INDEX IF NOT EXISTS idx_compliance_history_status ON public.compliance_history(overall_status);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_user_id ON public.compliance_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_active ON public.compliance_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON public.compliance_alerts(severity);

CREATE INDEX IF NOT EXISTS idx_compliance_analytics_user_id ON public.compliance_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_analytics_report_date ON public.compliance_analytics(report_date);

-- ============================================
-- PART 10: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.compliance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 11: RLS POLICIES
-- ============================================

-- Compliance Tracking Policies
CREATE POLICY "Users can manage their own compliance tracking" ON public.compliance_tracking
  FOR ALL USING (auth.uid() = user_id);

-- Compliance Documents Policies  
CREATE POLICY "Users can manage their own compliance documents" ON public.compliance_documents
  FOR ALL USING (auth.uid() = user_id);

-- Compliance Recurring Policies
CREATE POLICY "Users can manage their own recurring compliance" ON public.compliance_recurring
  FOR ALL USING (auth.uid() = user_id);

-- Compliance History Policies
CREATE POLICY "Users can view their own compliance history" ON public.compliance_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert compliance history" ON public.compliance_history
  FOR INSERT WITH CHECK (true);

-- Compliance Preferences Policies
CREATE POLICY "Users can manage their own compliance preferences" ON public.compliance_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Compliance Alerts Policies
CREATE POLICY "Users can read their own compliance alerts" ON public.compliance_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own compliance alerts" ON public.compliance_alerts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Compliance Analytics Policies
CREATE POLICY "Users can view their compliance analytics" ON public.compliance_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their compliance analytics" ON public.compliance_analytics
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 12: INSERT DEFAULT COMPLIANCE RULES
-- ============================================

INSERT INTO public.compliance_rules (rule_name, description, rule_type, frequency, deadline_offset, required_documents, is_critical, applies_to) VALUES
('grant_reporting_quarterly', 'Quarterly grant reporting requirements', 'recurring', 'quarterly', 30, ARRAY['financial_report', 'progress_report'], true, ARRAY['nonprofit', 'government']),
('tax_filing_annual', 'Annual tax filing requirements', 'recurring', 'annual', 60, ARRAY['990_form', 'financial_statements'], true, ARRAY['nonprofit']),
('audit_preparation', 'Annual audit preparation', 'recurring', 'annual', 90, ARRAY['audit_documentation', 'internal_controls'], false, ARRAY['nonprofit']),
('sba_size_certification', 'SBA size standards certification', 'document', null, 30, ARRAY['size_certification'], true, ARRAY['small_business']),
('duns_registration', 'DUNS number registration and renewal', 'recurring', 'annual', 60, ARRAY['duns_documentation'], true, ARRAY['all']),
('sam_registration', 'SAM.gov registration renewal', 'recurring', 'annual', 30, ARRAY['sam_documentation'], true, ARRAY['all']),
('workers_comp_renewal', 'Workers compensation insurance renewal', 'recurring', 'annual', 45, ARRAY['workers_comp_policy'], true, ARRAY['all']),
('general_liability_renewal', 'General liability insurance renewal', 'recurring', 'annual', 45, ARRAY['liability_policy'], true, ARRAY['all']);

-- ============================================
-- PART 13: VERIFICATION QUERIES
-- ============================================

-- Verify tables were created
SELECT 
  'COMPLIANCE TABLES CREATED' as status,
  COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'compliance_%';

-- Verify default rules were inserted
SELECT 
  'DEFAULT RULES INSERTED' as status,
  COUNT(*) as rule_count
FROM public.compliance_rules;

-- Show sample of rules
SELECT 
  rule_name,
  description,
  rule_type,
  frequency,
  is_critical
FROM public.compliance_rules
ORDER BY is_critical DESC, rule_name;

-- Verify alerts table
SELECT COUNT(*) AS alert_count FROM public.compliance_alerts;

-- Verify analytics table
SELECT COUNT(*) AS analytics_count FROM public.compliance_analytics;