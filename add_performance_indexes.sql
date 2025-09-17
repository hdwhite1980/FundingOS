-- Performance optimization indexes for FundingOS
-- Based on common query patterns identified in schema analysis

-- Opportunities table - frequently queried by source and date
CREATE INDEX IF NOT EXISTS opportunities_source_last_updated_idx ON opportunities(source, last_updated);
CREATE INDEX IF NOT EXISTS opportunities_deadline_date_idx ON opportunities(deadline_date) WHERE deadline_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS opportunities_status_idx ON opportunities(status);

-- Project opportunities - junction table queries
CREATE INDEX IF NOT EXISTS project_opportunities_project_id_idx ON project_opportunities(project_id);
CREATE INDEX IF NOT EXISTS project_opportunities_opportunity_id_idx ON project_opportunities(opportunity_id);
CREATE INDEX IF NOT EXISTS project_opportunities_user_id_idx ON project_opportunities(user_id);

-- Agent system performance
CREATE INDEX IF NOT EXISTS agent_conversations_user_id_created_at_idx ON agent_conversations(user_id, created_at);
CREATE INDEX IF NOT EXISTS agent_activity_log_user_id_created_at_idx ON agent_activity_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS agent_decisions_user_id_status_idx ON agent_decisions(user_id, status);

-- Projects - common filters
CREATE INDEX IF NOT EXISTS projects_user_id_created_at_idx ON projects(user_id, created_at);
CREATE INDEX IF NOT EXISTS projects_location_idx ON projects(location);
CREATE INDEX IF NOT EXISTS projects_project_type_idx ON projects(project_type);

-- Donations and fundraising
CREATE INDEX IF NOT EXISTS donations_user_id_donation_date_idx ON donations(user_id, donation_date);
CREATE INDEX IF NOT EXISTS donations_project_id_idx ON donations(project_id);
CREATE INDEX IF NOT EXISTS campaigns_user_id_status_idx ON campaigns(user_id, status);

-- Application submissions
CREATE INDEX IF NOT EXISTS application_submissions_user_id_created_at_idx ON application_submissions(user_id, created_at);
CREATE INDEX IF NOT EXISTS application_submissions_project_id_idx ON application_submissions(project_id);
CREATE INDEX IF NOT EXISTS application_submissions_status_idx ON application_submissions(status);

-- Dynamic forms
CREATE INDEX IF NOT EXISTS dynamic_form_submissions_user_id_idx ON dynamic_form_submissions(user_id);
CREATE INDEX IF NOT EXISTS dynamic_form_submissions_project_id_idx ON dynamic_form_submissions(project_id);
CREATE INDEX IF NOT EXISTS dynamic_form_templates_form_type_idx ON dynamic_form_templates(form_type);

-- AI analytics
CREATE INDEX IF NOT EXISTS ai_search_analytics_user_id_created_at_idx ON ai_search_analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS ai_sessions_user_id_created_at_idx ON ai_sessions(user_id, created_at);

-- Chat system
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_is_active_idx ON chat_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS chat_messages_session_id_timestamp_idx ON chat_messages(session_id, timestamp);

-- Data sync performance
CREATE INDEX IF NOT EXISTS data_sync_logs_source_started_at_idx ON data_sync_logs(source, started_at);
CREATE INDEX IF NOT EXISTS data_sync_logs_status_idx ON data_sync_logs(status);

-- Investment tracking
CREATE INDEX IF NOT EXISTS angel_investments_investor_id_idx ON angel_investments(investor_id);
CREATE INDEX IF NOT EXISTS angel_investments_project_id_idx ON angel_investments(project_id);
CREATE INDEX IF NOT EXISTS investments_user_id_created_at_idx ON investments(user_id, created_at);

COMMENT ON INDEX opportunities_source_last_updated_idx IS 'Optimize sync queries by source and date';
COMMENT ON INDEX project_opportunities_project_id_idx IS 'Fast project-opportunity lookups';
COMMENT ON INDEX agent_conversations_user_id_created_at_idx IS 'Agent chat history queries';