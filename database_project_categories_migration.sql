-- Migration: Update projects table to support multiple project categories
-- Date: 2025-09-17
-- Purpose: Change project_category from single TEXT field to project_categories JSON array

-- Check if project_categories column exists, if not create it
DO $$
BEGIN
  -- Add the new project_categories column as a JSON array
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_categories') THEN
    ALTER TABLE projects ADD COLUMN project_categories JSON DEFAULT '[]'::json;
    RAISE NOTICE 'Added project_categories column as JSON array';
  ELSE
    RAISE NOTICE 'project_categories column already exists';
  END IF;
  
  -- Migrate existing single category data to categories array
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_category') THEN
    -- Update rows that have a project_category but empty project_categories
    UPDATE projects 
    SET project_categories = json_build_array(project_category)::json
    WHERE project_category IS NOT NULL 
      AND project_category != ''
      AND (project_categories IS NULL OR project_categories::text = '[]');
      
    RAISE NOTICE 'Migrated existing project_category data to project_categories array';
  END IF;
  
  -- Create index on project_categories for better query performance
  CREATE INDEX IF NOT EXISTS idx_projects_project_categories ON projects USING GIN (project_categories);
  RAISE NOTICE 'Created GIN index on project_categories';
  
  -- Keep the old project_category column for backward compatibility
  -- Don't drop it yet in case we need to rollback
  
END $$;

-- Verify the migration
SELECT 
  count(*) as total_projects,
  count(CASE WHEN project_category IS NOT NULL AND project_category != '' THEN 1 END) as projects_with_old_category,
  count(CASE WHEN project_categories IS NOT NULL AND project_categories::text != '[]' THEN 1 END) as projects_with_new_categories
FROM projects;

RAISE NOTICE 'Project categories migration completed successfully!';