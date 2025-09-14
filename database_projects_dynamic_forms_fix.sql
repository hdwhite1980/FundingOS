-- Additional database updates to support dynamic forms in projects table
-- Run this after the main database_dynamic_forms_update.sql

-- Add dynamic form support to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS uploaded_documents JSONB,
ADD COLUMN IF NOT EXISTS dynamic_form_structure JSONB;

-- Add index for the new columns
CREATE INDEX IF NOT EXISTS idx_projects_uploaded_documents ON projects USING GIN (uploaded_documents);
CREATE INDEX IF NOT EXISTS idx_projects_dynamic_form_structure ON projects USING GIN (dynamic_form_structure);

-- Also add similar columns to opportunities table for completeness
ALTER TABLE opportunities  
ADD COLUMN IF NOT EXISTS uploaded_documents JSONB,
ADD COLUMN IF NOT EXISTS dynamic_form_structure JSONB;

-- Add indexes for opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_uploaded_documents ON opportunities USING GIN (uploaded_documents);
CREATE INDEX IF NOT EXISTS idx_opportunities_dynamic_form_structure ON opportunities USING GIN (dynamic_form_structure);

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Additional Dynamic Form Support Added!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '- projects.uploaded_documents (JSONB)';  
  RAISE NOTICE '- projects.dynamic_form_structure (JSONB)';
  RAISE NOTICE '- opportunities.uploaded_documents (JSONB)';
  RAISE NOTICE '- opportunities.dynamic_form_structure (JSONB)';
  RAISE NOTICE '';
  RAISE NOTICE 'Now the system can store and retrieve dynamic form structures';
  RAISE NOTICE 'directly in projects and opportunities tables.';
  RAISE NOTICE '================================================================';
END $$;