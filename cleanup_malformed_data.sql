-- Clean up malformed array data before main migration
-- Run this BEFORE the main database_enhanced_ai_discovery.sql script

DO $$
DECLARE
  rec RECORD;
  cleaned_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting cleanup of malformed array data...';
  
  -- Check if project_types column exists and has problematic values
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='opportunities' 
             AND column_name='project_types') THEN
    
    -- Clean up various malformed values
    UPDATE opportunities 
    SET project_types = NULL 
    WHERE project_types IS NOT NULL 
    AND (
      project_types = '' OR 
      project_types = '""' OR 
      project_types = '{}' OR 
      project_types = 'null' OR
      project_types = '[]' OR
      length(trim(project_types)) = 0
    );
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % malformed project_types values', cleaned_count;
    
    -- Show remaining non-null values for inspection
    FOR rec IN 
      SELECT DISTINCT project_types, COUNT(*) as count
      FROM opportunities 
      WHERE project_types IS NOT NULL
      GROUP BY project_types
      LIMIT 10
    LOOP
      RAISE NOTICE 'Remaining project_types value: "%" (count: %)', rec.project_types, rec.count;
    END LOOP;
    
  END IF;
  
  -- Check if eligibility_criteria has problematic array values
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='opportunities' 
             AND column_name='eligibility_criteria'
             AND data_type LIKE '%ARRAY%') THEN
    
    -- Clean up empty arrays that might cause issues
    UPDATE opportunities 
    SET eligibility_criteria = NULL 
    WHERE eligibility_criteria IS NOT NULL 
    AND array_length(eligibility_criteria, 1) IS NULL;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % empty eligibility_criteria arrays', cleaned_count;
    
  END IF;
  
  RAISE NOTICE 'Data cleanup completed successfully!';
  RAISE NOTICE 'You can now run the main migration script.';
  
END $$;