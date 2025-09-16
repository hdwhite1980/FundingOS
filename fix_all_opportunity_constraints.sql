-- Comprehensive fix for opportunity insertion issues
-- This script ensures all commonly required fields have appropriate defaults

DO $$
DECLARE
  col_info RECORD;
BEGIN
  RAISE NOTICE 'Analyzing opportunities table constraints...';
  
  -- Show all NOT NULL columns first
  FOR col_info IN 
    SELECT column_name, data_type, column_default
    FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND is_nullable = 'NO'
    ORDER BY column_name
  LOOP
    RAISE NOTICE 'Required field: % (%) default: %', 
      col_info.column_name, 
      col_info.data_type, 
      COALESCE(col_info.column_default, 'none');
  END LOOP;

  -- Fix sponsor column (make nullable)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'sponsor' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Making sponsor column nullable...';
    ALTER TABLE opportunities ALTER COLUMN sponsor DROP NOT NULL;
  END IF;

  -- Fix agency column if it exists and is required
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'agency' 
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    RAISE NOTICE 'Adding default value for agency column...';
    ALTER TABLE opportunities ALTER COLUMN agency SET DEFAULT 'Unknown';
  END IF;

  -- Fix title column if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'title' 
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    RAISE NOTICE 'Adding default value for title column...';
    ALTER TABLE opportunities ALTER COLUMN title SET DEFAULT 'Untitled Opportunity';
  END IF;

  -- Fix description column if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'description' 
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    RAISE NOTICE 'Making description column nullable...';
    ALTER TABLE opportunities ALTER COLUMN description DROP NOT NULL;
  END IF;

  -- Fix status column if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'status' 
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    RAISE NOTICE 'Adding default value for status column...';
    ALTER TABLE opportunities ALTER COLUMN status SET DEFAULT 'discovered';
  END IF;

  -- Fix created_at if needed (should have default)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'created_at' 
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    RAISE NOTICE 'Adding default value for created_at column...';
    ALTER TABLE opportunities ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  -- Fix updated_at if needed (should have default)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'updated_at' 
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    RAISE NOTICE 'Adding default value for updated_at column...';
    ALTER TABLE opportunities ALTER COLUMN updated_at SET DEFAULT NOW();
  END IF;

  -- Fix check constraint issues by making enum fields nullable
  -- This allows AI-generated data to have NULL values when categorization is uncertain
  
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

  RAISE NOTICE 'Constraint fixes completed!';
  
END $$;

-- Verify the fixes
SELECT 
  'opportunities constraints after fixes' as info,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_default IS NOT NULL THEN column_default
    WHEN is_nullable = 'YES' THEN 'nullable'
    ELSE '⚠️ required, no default'
  END as constraint_status
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
ORDER BY 
  CASE 
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN 1 
    WHEN is_nullable = 'NO' THEN 2
    ELSE 3 
  END,
  column_name;