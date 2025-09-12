-- Enhanced Onboarding and Project Creation Database Updates
-- This script adds all the new fields needed for the comprehensive onboarding and project creation flows

-- ======================================================================
-- 1. ENHANCED USER_PROFILES TABLE FOR COMPREHENSIVE ONBOARDING
-- ======================================================================

-- Add all new onboarding fields to user_profiles table
DO $$
BEGIN
  -- Step 1: Organization Basics (already mostly exists)
  -- full_name, organization_name, organization_type already exist
  
  -- Add new organization basic fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='organization_type_other') THEN
    ALTER TABLE user_profiles ADD COLUMN organization_type_other TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='phone') THEN
    ALTER TABLE user_profiles ADD COLUMN phone TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='website') THEN
    ALTER TABLE user_profiles ADD COLUMN website TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='address_line1') THEN
    ALTER TABLE user_profiles ADD COLUMN address_line1 TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='address_line2') THEN
    ALTER TABLE user_profiles ADD COLUMN address_line2 TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='city') THEN
    ALTER TABLE user_profiles ADD COLUMN city TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='state_province') THEN
    ALTER TABLE user_profiles ADD COLUMN state_province TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='postal_code') THEN
    ALTER TABLE user_profiles ADD COLUMN postal_code TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='country') THEN
    ALTER TABLE user_profiles ADD COLUMN country TEXT DEFAULT 'United States';
  END IF;

  -- Step 2: Legal Structure & Compliance
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='legal_structure') THEN
    ALTER TABLE user_profiles ADD COLUMN legal_structure TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='incorporation_year') THEN
    ALTER TABLE user_profiles ADD COLUMN incorporation_year INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='ein') THEN
    ALTER TABLE user_profiles ADD COLUMN ein TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='duns_uei') THEN
    ALTER TABLE user_profiles ADD COLUMN duns_uei TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='sam_registration') THEN
    ALTER TABLE user_profiles ADD COLUMN sam_registration TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='irs_status') THEN
    ALTER TABLE user_profiles ADD COLUMN irs_status TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='special_certifications') THEN
    ALTER TABLE user_profiles ADD COLUMN special_certifications TEXT[];
  END IF;

  -- Step 3: Organizational Capacity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='years_operating') THEN
    ALTER TABLE user_profiles ADD COLUMN years_operating INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='full_time_staff') THEN
    ALTER TABLE user_profiles ADD COLUMN full_time_staff INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='part_time_staff') THEN
    ALTER TABLE user_profiles ADD COLUMN part_time_staff INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='volunteers') THEN
    ALTER TABLE user_profiles ADD COLUMN volunteers INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='board_members') THEN
    ALTER TABLE user_profiles ADD COLUMN board_members INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='previous_awards') THEN
    ALTER TABLE user_profiles ADD COLUMN previous_awards TEXT;
  END IF;

  -- Step 4: Financial Health
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='annual_budget') THEN
    ALTER TABLE user_profiles ADD COLUMN annual_budget NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='funding_sources') THEN
    ALTER TABLE user_profiles ADD COLUMN funding_sources TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='audit_status') THEN
    ALTER TABLE user_profiles ADD COLUMN audit_status TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='indirect_cost_rate') THEN
    ALTER TABLE user_profiles ADD COLUMN indirect_cost_rate NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='indirect_rate_type') THEN
    ALTER TABLE user_profiles ADD COLUMN indirect_rate_type TEXT;
  END IF;

  -- Step 5: Program Areas & Populations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='primary_focus_areas') THEN
    ALTER TABLE user_profiles ADD COLUMN primary_focus_areas TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='populations_served') THEN
    ALTER TABLE user_profiles ADD COLUMN populations_served TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='geographic_service_area') THEN
    ALTER TABLE user_profiles ADD COLUMN geographic_service_area TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='mission_statement') THEN
    ALTER TABLE user_profiles ADD COLUMN mission_statement TEXT;
  END IF;

  -- Step 6: Team & Leadership
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='leadership_experience') THEN
    ALTER TABLE user_profiles ADD COLUMN leadership_experience TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='board_diversity') THEN
    ALTER TABLE user_profiles ADD COLUMN board_diversity TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='key_partnerships') THEN
    ALTER TABLE user_profiles ADD COLUMN key_partnerships TEXT;
  END IF;

  -- Step 7: Funding Preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='preferred_funding_types') THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_funding_types TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='typical_award_size') THEN
    ALTER TABLE user_profiles ADD COLUMN typical_award_size TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='grant_writing_capacity') THEN
    ALTER TABLE user_profiles ADD COLUMN grant_writing_capacity TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='compliance_capacity') THEN
    ALTER TABLE user_profiles ADD COLUMN compliance_capacity TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='risk_tolerance') THEN
    ALTER TABLE user_profiles ADD COLUMN risk_tolerance TEXT;
  END IF;

END $$;

-- ======================================================================
-- 2. ENHANCED PROJECTS TABLE FOR COMPREHENSIVE PROJECT CREATION
-- ======================================================================

-- Add all new project creation fields to projects table
DO $$
BEGIN
  -- Step 1: Project Basics (name and description likely exist)
  -- Ensure basic fields exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='name') THEN
    ALTER TABLE projects ADD COLUMN name TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='description') THEN
    ALTER TABLE projects ADD COLUMN description TEXT;
  END IF;
  
  -- Add project category fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_category') THEN
    ALTER TABLE projects ADD COLUMN project_category TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_category_other') THEN
    ALTER TABLE projects ADD COLUMN project_category_other TEXT;
  END IF;

  -- Step 2: Scope & Impact
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='target_population_description') THEN
    ALTER TABLE projects ADD COLUMN target_population_description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='estimated_people_served') THEN
    ALTER TABLE projects ADD COLUMN estimated_people_served INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_location') THEN
    ALTER TABLE projects ADD COLUMN project_location TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='proposed_start_date') THEN
    ALTER TABLE projects ADD COLUMN proposed_start_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_duration') THEN
    ALTER TABLE projects ADD COLUMN project_duration TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='key_milestones') THEN
    ALTER TABLE projects ADD COLUMN key_milestones TEXT;
  END IF;

  -- Step 3: Funding Requirements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='total_project_budget') THEN
    ALTER TABLE projects ADD COLUMN total_project_budget NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='personnel_percentage') THEN
    ALTER TABLE projects ADD COLUMN personnel_percentage NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='equipment_percentage') THEN
    ALTER TABLE projects ADD COLUMN equipment_percentage NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='travel_percentage') THEN
    ALTER TABLE projects ADD COLUMN travel_percentage NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='indirect_percentage') THEN
    ALTER TABLE projects ADD COLUMN indirect_percentage NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='other_percentage') THEN
    ALTER TABLE projects ADD COLUMN other_percentage NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='funding_request_amount') THEN
    ALTER TABLE projects ADD COLUMN funding_request_amount NUMERIC;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='cash_match_available') THEN
    ALTER TABLE projects ADD COLUMN cash_match_available NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='in_kind_match_available') THEN
    ALTER TABLE projects ADD COLUMN in_kind_match_available NUMERIC DEFAULT 0;
  END IF;

  -- Step 4: Project Readiness
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='current_status') THEN
    ALTER TABLE projects ADD COLUMN current_status TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_director_status') THEN
    ALTER TABLE projects ADD COLUMN project_director_status TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='key_staff_status') THEN
    ALTER TABLE projects ADD COLUMN key_staff_status TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='collaborating_organizations') THEN
    ALTER TABLE projects ADD COLUMN collaborating_organizations TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='partnership_mous') THEN
    ALTER TABLE projects ADD COLUMN partnership_mous TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='partnership_role') THEN
    ALTER TABLE projects ADD COLUMN partnership_role TEXT;
  END IF;

  -- Step 5: Outcomes & Evaluation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='primary_goals') THEN
    ALTER TABLE projects ADD COLUMN primary_goals TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='output_measures') THEN
    ALTER TABLE projects ADD COLUMN output_measures TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='outcome_measures') THEN
    ALTER TABLE projects ADD COLUMN outcome_measures TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='impact_measures') THEN
    ALTER TABLE projects ADD COLUMN impact_measures TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='evaluation_plan') THEN
    ALTER TABLE projects ADD COLUMN evaluation_plan TEXT;
  END IF;

  -- Step 6: Funding Strategy
  -- preferred_funding_types might already exist from previous updates
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='preferred_funding_types') THEN
    ALTER TABLE projects ADD COLUMN preferred_funding_types TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='funding_decision_needed') THEN
    ALTER TABLE projects ADD COLUMN funding_decision_needed DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='latest_useful_start') THEN
    ALTER TABLE projects ADD COLUMN latest_useful_start DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='urgency_level') THEN
    ALTER TABLE projects ADD COLUMN urgency_level TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='sustainability_plan') THEN
    ALTER TABLE projects ADD COLUMN sustainability_plan TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='other_funding_sources') THEN
    ALTER TABLE projects ADD COLUMN other_funding_sources TEXT;
  END IF;

  -- Step 7: Innovation & Review
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='unique_innovation') THEN
    ALTER TABLE projects ADD COLUMN unique_innovation TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='evidence_base') THEN
    ALTER TABLE projects ADD COLUMN evidence_base TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='strategic_fit') THEN
    ALTER TABLE projects ADD COLUMN strategic_fit TEXT;
  END IF;

END $$;

-- ======================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ======================================================================

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_type ON user_profiles(organization_type);
CREATE INDEX IF NOT EXISTS idx_user_profiles_legal_structure ON user_profiles(legal_structure);
CREATE INDEX IF NOT EXISTS idx_user_profiles_annual_budget ON user_profiles(annual_budget);

CREATE INDEX IF NOT EXISTS idx_projects_project_category ON projects(project_category);
CREATE INDEX IF NOT EXISTS idx_projects_project_duration ON projects(project_duration);
CREATE INDEX IF NOT EXISTS idx_projects_funding_request_amount ON projects(funding_request_amount);
CREATE INDEX IF NOT EXISTS idx_projects_proposed_start_date ON projects(proposed_start_date);
CREATE INDEX IF NOT EXISTS idx_projects_urgency_level ON projects(urgency_level);

-- GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_user_profiles_funding_sources ON user_profiles USING GIN(funding_sources);
CREATE INDEX IF NOT EXISTS idx_user_profiles_primary_focus_areas ON user_profiles USING GIN(primary_focus_areas);
CREATE INDEX IF NOT EXISTS idx_user_profiles_populations_served ON user_profiles USING GIN(populations_served);
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_funding_types ON user_profiles USING GIN(preferred_funding_types);
CREATE INDEX IF NOT EXISTS idx_user_profiles_special_certifications ON user_profiles USING GIN(special_certifications);

CREATE INDEX IF NOT EXISTS idx_projects_primary_goals ON projects USING GIN(primary_goals);
CREATE INDEX IF NOT EXISTS idx_projects_preferred_funding_types ON projects USING GIN(preferred_funding_types);

-- ======================================================================
-- 4. UPDATE EXISTING RECORDS (OPTIONAL)
-- ======================================================================

-- Set default values for existing records where appropriate
DO $$
BEGIN
  -- Set default country for existing profiles
  UPDATE user_profiles 
  SET country = 'United States' 
  WHERE country IS NULL;
  
  -- Set default funding request amount for projects missing it
  UPDATE projects 
  SET funding_request_amount = total_project_budget 
  WHERE funding_request_amount IS NULL AND total_project_budget IS NOT NULL;
  
  -- Set default cash and in-kind match to 0 if null
  UPDATE projects 
  SET cash_match_available = 0 
  WHERE cash_match_available IS NULL;
  
  UPDATE projects 
  SET in_kind_match_available = 0 
  WHERE in_kind_match_available IS NULL;

END $$;

-- ======================================================================
-- COMPLETION MESSAGE
-- ======================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Enhanced Onboarding and Project Creation Database Update Complete!';
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Added comprehensive fields to user_profiles table:';
  RAISE NOTICE '- Organization details, legal structure, compliance info';
  RAISE NOTICE '- Organizational capacity, financial health, program areas';
  RAISE NOTICE '- Team leadership, funding preferences, risk assessment';
  RAISE NOTICE '';
  RAISE NOTICE 'Added comprehensive fields to projects table:';
  RAISE NOTICE '- Project categorization, scope and impact definition';
  RAISE NOTICE '- Detailed budget breakdown, project readiness assessment';
  RAISE NOTICE '- Outcomes evaluation, funding strategy, innovation tracking';
  RAISE NOTICE '';
  RAISE NOTICE 'All indexes created for optimal query performance.';
  RAISE NOTICE 'Your enhanced onboarding and project creation system is ready!';
  RAISE NOTICE '=======================================================';
END $$;