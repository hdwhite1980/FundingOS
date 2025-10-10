-- Ensure a unique constraint exists for deduplication/upsert on opportunities(external_id, source)
-- This script safely removes duplicates and adds a unique index used by ON CONFLICT

DO $$
BEGIN
  RAISE NOTICE 'Deduplicating opportunities on (external_id, source) before adding unique index...';
END $$;

-- Delete duplicate rows keeping the first encountered row per (external_id, source)
WITH dups AS (
  SELECT external_id, source, MIN(ctid) AS keep_ctid, ARRAY_AGG(ctid) AS all_ctids
  FROM opportunities
  WHERE external_id IS NOT NULL AND source IS NOT NULL
  GROUP BY external_id, source
  HAVING COUNT(*) > 1
)
DELETE FROM opportunities o
USING dups d
WHERE o.external_id = d.external_id
  AND o.source = d.source
  AND o.ctid <> d.keep_ctid
  AND o.ctid = ANY(d.all_ctids);

-- Create the unique index used by upserts (composite key)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_opportunities_external_id_source
  ON opportunities (external_id, source);

DO $$
BEGIN
  RAISE NOTICE 'Unique index uidx_opportunities_external_id_source ensured.';
END $$;
