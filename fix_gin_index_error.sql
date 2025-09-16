-- Fix GIN Index Error for eligibility_criteria conversion
-- Run this in Supabase SQL Editor BEFORE running the main migration

DO $$
DECLARE
  idx_record RECORD;
BEGIN
  RAISE NOTICE 'Starting GIN index cleanup for eligibility_criteria...';
  
  -- Find and drop ALL indexes that reference eligibility_criteria
  FOR idx_record IN 
    SELECT indexname, indexdef
    FROM pg_indexes 
    WHERE tablename = 'opportunities' 
    AND (indexdef LIKE '%eligibility_criteria%' OR indexname LIKE '%eligibility%')
  LOOP
    RAISE NOTICE 'Dropping index: % - %', idx_record.indexname, idx_record.indexdef;
    EXECUTE 'DROP INDEX IF EXISTS ' || idx_record.indexname || ' CASCADE';
  END LOOP;
  
  -- Check current data type of eligibility_criteria
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='opportunities' 
             AND column_name='eligibility_criteria' 
             AND data_type LIKE '%ARRAY%') THEN
    RAISE NOTICE 'Converting eligibility_criteria from ARRAY to TEXT...';
    
    -- Convert the column type safely
    ALTER TABLE opportunities ALTER COLUMN eligibility_criteria TYPE TEXT 
    USING CASE 
      WHEN eligibility_criteria IS NULL THEN NULL
      WHEN array_length(eligibility_criteria, 1) IS NULL THEN ''
      ELSE array_to_string(eligibility_criteria, '; ')
    END;
    
    RAISE NOTICE 'Successfully converted eligibility_criteria to TEXT';
  ELSE
    RAISE NOTICE 'eligibility_criteria is already TEXT type or does not exist';
  END IF;
  
  -- Create appropriate text index
  CREATE INDEX IF NOT EXISTS idx_opportunities_eligibility_text 
  ON opportunities USING btree(eligibility_criteria) 
  WHERE eligibility_criteria IS NOT NULL AND eligibility_criteria != '';
  
  RAISE NOTICE 'Created new text-based index for eligibility_criteria';
  RAISE NOTICE 'GIN index cleanup completed successfully!';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error during cleanup: %', SQLERRM;
  RAISE;
END $$;

-- Verify the result
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
AND column_name = 'eligibility_criteria';

-- Show any remaining indexes on eligibility_criteria
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'opportunities' 
AND indexdef LIKE '%eligibility_criteria%';