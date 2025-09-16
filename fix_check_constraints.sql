-- Fix check constraint violations for opportunities table
-- This script ensures all enum-like fields have valid values or are nullable

DO $$
DECLARE
  constraint_info RECORD;
BEGIN
  RAISE NOTICE 'Analyzing check constraints on opportunities table...';
  
  -- Show all check constraints
  FOR constraint_info IN 
    SELECT tc.constraint_name, cc.check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_name = 'opportunities' 
    AND tc.constraint_type = 'CHECK'
    ORDER BY tc.constraint_name
  LOOP
    RAISE NOTICE 'Check constraint: % - %', constraint_info.constraint_name, constraint_info.check_clause;
  END LOOP;

  RAISE NOTICE 'Fixing check constraint issues...';

  -- Option 1: Make constrained fields nullable (recommended for AI-generated data)
  -- This allows NULL values when AI analysis doesn't provide these specific categorizations
  
  -- Fix recommendation_strength constraint (allow NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'recommendation_strength' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Making recommendation_strength nullable...';
    ALTER TABLE opportunities ALTER COLUMN recommendation_strength DROP NOT NULL;
  END IF;

  -- Fix application_priority constraint (allow NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'application_priority' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Making application_priority nullable...';
    ALTER TABLE opportunities ALTER COLUMN application_priority DROP NOT NULL;
  END IF;

  -- Fix application_complexity constraint (allow NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'application_complexity' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Making application_complexity nullable...';
    ALTER TABLE opportunities ALTER COLUMN application_complexity DROP NOT NULL;
  END IF;

  -- Fix competition_level constraint (allow NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'competition_level' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Making competition_level nullable...';
    ALTER TABLE opportunities ALTER COLUMN competition_level DROP NOT NULL;
  END IF;

  -- Fix strategic_priority constraint (allow NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'strategic_priority' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Making strategic_priority nullable...';
    ALTER TABLE opportunities ALTER COLUMN strategic_priority DROP NOT NULL;
  END IF;

  RAISE NOTICE 'Check constraint fixes completed!';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error during constraint fixes: %', SQLERRM;
  RAISE;
END $$;

-- Show updated column information
SELECT 
  'opportunities enum columns after fixes' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
AND column_name IN (
  'recommendation_strength', 
  'application_priority', 
  'application_complexity', 
  'competition_level', 
  'strategic_priority',
  'status'
)
ORDER BY column_name;