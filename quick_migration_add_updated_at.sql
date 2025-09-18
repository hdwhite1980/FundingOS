-- Idempotent migration: ensure updated_at exists on opportunities and is maintained automatically
DO $$
BEGIN
  -- Add the column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'opportunities'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.opportunities
      ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Ensure function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'update_updated_at_column'
      AND n.nspname = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $upd$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $upd$ LANGUAGE plpgsql;
  END IF;

  -- Create trigger if not present
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_opportunities_updated_at'
  ) THEN
    CREATE TRIGGER update_opportunities_updated_at
    BEFORE UPDATE ON public.opportunities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;