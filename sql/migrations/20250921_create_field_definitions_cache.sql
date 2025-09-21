-- Migration: Create field_definitions_cache table
-- Run this against your Supabase/Postgres database

CREATE TABLE IF NOT EXISTS field_definitions_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name text UNIQUE NOT NULL,
  definition jsonb NOT NULL,
  usage_count integer DEFAULT 0,
  quality_score numeric DEFAULT 0.75,
  is_fallback boolean DEFAULT false,
  user_id uuid NULL,
  last_updated timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now()
);

-- Optional: index for quick lookup
CREATE INDEX IF NOT EXISTS idx_field_definitions_cache_field_name ON field_definitions_cache (field_name);

-- Example function to increment usage count (used by updateUsageCount placeholder)
CREATE OR REPLACE FUNCTION increment_usage_count() RETURNS integer AS $$
BEGIN
  RETURN 1;
END;
$$ LANGUAGE plpgsql;
