-- Fix opportunities table - add updated_at column and synchronize with last_updated
-- This fixes the error: record "new" has no field "updated_at"

DO $$
BEGIN
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='opportunities' AND column_name='updated_at') THEN
    ALTER TABLE opportunities ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to opportunities table';
  ELSE
    RAISE NOTICE 'updated_at column already exists in opportunities table';
  END IF;

  -- Update existing records to sync updated_at with last_updated
  UPDATE opportunities 
  SET updated_at = COALESCE(last_updated, NOW())
  WHERE updated_at IS NULL OR updated_at != COALESCE(last_updated, NOW());
  
  RAISE NOTICE 'Synchronized updated_at with last_updated for existing records';

  -- Ensure the trigger exists for auto-updating updated_at
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_opportunities_updated_at') THEN
    -- First ensure the function exists
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create the trigger
    CREATE TRIGGER update_opportunities_updated_at
      BEFORE UPDATE ON opportunities
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE 'Created trigger update_opportunities_updated_at';
  ELSE
    RAISE NOTICE 'Trigger update_opportunities_updated_at already exists';
  END IF;

END $$;

-- Verify the fix
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
  AND column_name IN ('updated_at', 'last_updated')
ORDER BY column_name;