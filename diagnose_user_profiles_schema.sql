-- Comprehensive diagnostic for user_profiles table
-- Run this in Supabase SQL Editor to see what's missing

-- ============================================
-- PART 1: List ALL current columns
-- ============================================

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ============================================
-- PART 2: Check for specific Account Settings fields
-- ============================================

-- Profile fields
SELECT 'PROFILE FIELDS' as category;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'full_name') 
    THEN '✅ full_name EXISTS'
    ELSE '❌ full_name MISSING'
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'user_role') 
    THEN '✅ user_role EXISTS'
    ELSE '❌ user_role MISSING'
  END;

-- Legal Foundation fields
SELECT 'LEGAL FOUNDATION FIELDS' as category;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'tax_id') 
    THEN '✅ tax_id EXISTS'
    ELSE '❌ tax_id MISSING'
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'date_incorporated') 
    THEN '✅ date_incorporated EXISTS'
    ELSE '❌ date_incorporated MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'state_incorporated') 
    THEN '✅ state_incorporated EXISTS'
    ELSE '❌ state_incorporated MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'duns_uei_number') 
    THEN '✅ duns_uei_number EXISTS'
    ELSE '❌ duns_uei_number MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'sam_gov_status') 
    THEN '✅ sam_gov_status EXISTS'
    ELSE '❌ sam_gov_status MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'grants_gov_status') 
    THEN '✅ grants_gov_status EXISTS'
    ELSE '❌ grants_gov_status MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'compliance_history') 
    THEN '✅ compliance_history EXISTS'
    ELSE '❌ compliance_history MISSING'
  END;

-- Organization fields
SELECT 'ORGANIZATION FIELDS' as category;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'organization_name') 
    THEN '✅ organization_name EXISTS'
    ELSE '❌ organization_name MISSING'
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'organization_type') 
    THEN '✅ organization_type EXISTS'
    ELSE '❌ organization_type MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'audit_status') 
    THEN '✅ audit_status EXISTS'
    ELSE '❌ audit_status MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'financial_systems') 
    THEN '✅ financial_systems EXISTS'
    ELSE '❌ financial_systems MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'indirect_cost_rate') 
    THEN '✅ indirect_cost_rate EXISTS'
    ELSE '❌ indirect_cost_rate MISSING'
  END;

-- Address fields
SELECT 'ADDRESS FIELDS' as category;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'address_line1') 
    THEN '✅ address_line1 EXISTS'
    ELSE '❌ address_line1 MISSING'
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'address_line2') 
    THEN '✅ address_line2 EXISTS'
    ELSE '❌ address_line2 MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'city') 
    THEN '✅ city EXISTS'
    ELSE '❌ city MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'state') 
    THEN '✅ state EXISTS'
    ELSE '❌ state MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'zip_code') 
    THEN '✅ zip_code EXISTS'
    ELSE '❌ zip_code MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'phone') 
    THEN '✅ phone EXISTS'
    ELSE '❌ phone MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'website') 
    THEN '✅ website EXISTS'
    ELSE '❌ website MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'service_radius') 
    THEN '✅ service_radius EXISTS'
    ELSE '❌ service_radius MISSING'
  END;

-- Capacity fields
SELECT 'CAPACITY FIELDS' as category;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'annual_budget') 
    THEN '✅ annual_budget EXISTS'
    ELSE '❌ annual_budget MISSING'
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'years_in_operation') 
    THEN '✅ years_in_operation EXISTS'
    ELSE '❌ years_in_operation MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'full_time_staff') 
    THEN '✅ full_time_staff EXISTS'
    ELSE '❌ full_time_staff MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'board_size') 
    THEN '✅ board_size EXISTS'
    ELSE '❌ board_size MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'grant_experience') 
    THEN '✅ grant_experience EXISTS'
    ELSE '❌ grant_experience MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'largest_grant') 
    THEN '✅ largest_grant EXISTS'
    ELSE '❌ largest_grant MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'grant_writing_capacity') 
    THEN '✅ grant_writing_capacity EXISTS'
    ELSE '❌ grant_writing_capacity MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'data_collection_capacity') 
    THEN '✅ data_collection_capacity EXISTS'
    ELSE '❌ data_collection_capacity MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'partnership_approach') 
    THEN '✅ partnership_approach EXISTS'
    ELSE '❌ partnership_approach MISSING'
  END;

-- Mission fields
SELECT 'MISSION FIELDS' as category;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'mission_statement') 
    THEN '✅ mission_statement EXISTS'
    ELSE '❌ mission_statement MISSING'
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'primary_service_areas') 
    THEN '✅ primary_service_areas EXISTS'
    ELSE '❌ primary_service_areas MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'target_demographics') 
    THEN '✅ target_demographics EXISTS'
    ELSE '❌ target_demographics MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'key_outcomes') 
    THEN '✅ key_outcomes EXISTS'
    ELSE '❌ key_outcomes MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'unique_differentiators') 
    THEN '✅ unique_differentiators EXISTS'
    ELSE '❌ unique_differentiators MISSING'
  END;

-- Certification fields
SELECT 'CERTIFICATION FIELDS' as category;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'minority_owned') 
    THEN '✅ minority_owned EXISTS'
    ELSE '❌ minority_owned MISSING'
  END as status
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'woman_owned') 
    THEN '✅ woman_owned EXISTS'
    ELSE '❌ woman_owned MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'veteran_owned') 
    THEN '✅ veteran_owned EXISTS'
    ELSE '❌ veteran_owned MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'small_business') 
    THEN '✅ small_business EXISTS'
    ELSE '❌ small_business MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'hubzone_certified') 
    THEN '✅ hubzone_certified EXISTS'
    ELSE '❌ hubzone_certified MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'eight_a_certified') 
    THEN '✅ eight_a_certified EXISTS'
    ELSE '❌ eight_a_certified MISSING'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'disadvantaged_business') 
    THEN '✅ disadvantaged_business EXISTS'
    ELSE '❌ disadvantaged_business MISSING'
  END;

-- ============================================
-- PART 3: Summary count
-- ============================================

SELECT 
  COUNT(*) as total_columns,
  COUNT(CASE WHEN column_name LIKE '%tax%' OR column_name LIKE '%ein%' THEN 1 END) as tax_related_columns,
  COUNT(CASE WHEN column_name LIKE '%address%' OR column_name LIKE '%city%' OR column_name LIKE '%state%' OR column_name LIKE '%zip%' THEN 1 END) as address_columns,
  COUNT(CASE WHEN column_name LIKE '%grant%' THEN 1 END) as grant_related_columns
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles';
