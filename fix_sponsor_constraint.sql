-- Fix sponsor column constraint issue
-- This script handles the NOT NULL constraint on the sponsor column

-- Option 1: Make sponsor column nullable (recommended)
DO $$
BEGIN
  -- Check if sponsor column has NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' 
    AND column_name = 'sponsor' 
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Removing NOT NULL constraint from sponsor column...';
    
    -- Remove NOT NULL constraint
    ALTER TABLE opportunities ALTER COLUMN sponsor DROP NOT NULL;
    
    RAISE NOTICE 'Successfully made sponsor column nullable';
  ELSE
    RAISE NOTICE 'Sponsor column is already nullable or does not exist';
  END IF;
END $$;

-- Option 2: Add default value for sponsor column
-- Uncomment these lines if you prefer a default value instead of nullable

-- ALTER TABLE opportunities ALTER COLUMN sponsor SET DEFAULT 'Unknown';
-- 
-- -- Update any existing NULL values
-- UPDATE opportunities SET sponsor = 'Unknown' WHERE sponsor IS NULL;

-- Verify the change
SELECT 
  'sponsor column status after fix' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
AND column_name = 'sponsor';