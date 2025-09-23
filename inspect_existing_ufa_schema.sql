-- Inspect existing UFA table structures
-- This will show us what columns exist in the current UFA tables

-- Check structure of existing UFA tables
SELECT 
    'ufa_analysis_results' as table_name,
    'MISSING - needs to be created' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ufa_analysis_results'
)

UNION ALL

SELECT 
    'ufa_strategic_goals' as table_name,
    'MISSING - needs to be created' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ufa_strategic_goals'
)

UNION ALL

SELECT 
    'ufa_notifications' as table_name,
    'MISSING - needs to be created' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ufa_notifications'
)

UNION ALL

SELECT 
    'ufa_sba_knowledge_base' as table_name,
    'MISSING - needs to be created' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ufa_sba_knowledge_base'
)

UNION ALL

SELECT 
    'ufa_sba_programs' as table_name,
    'MISSING - needs to be created' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ufa_sba_programs'
)

UNION ALL

SELECT 
    'ufa_sba_readiness_assessments' as table_name,
    'MISSING - needs to be created' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ufa_sba_readiness_assessments'
);

-- Show columns in key existing UFA tables
SELECT 
    'EXISTING UFA GOALS COLUMNS' as info_type,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as column_list
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ufa_goals'

UNION ALL

SELECT 
    'EXISTING UFA METRICS COLUMNS' as info_type,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as column_list
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ufa_metrics'

UNION ALL

SELECT 
    'EXISTING UFA SBA KNOWLEDGE COLUMNS' as info_type,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as column_list
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ufa_sba_knowledge';