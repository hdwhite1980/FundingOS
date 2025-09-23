-- Cleanup previously inserted non-program entries from ufa_sba_programs
-- Run this against your Supabase DB if needed
DELETE FROM ufa_sba_programs
WHERE LOWER(name) IN (
  'content',
  'find a cdc near you',
  'contact an intermediary'
)
OR LOWER(source_url) LIKE '%/find-%'
OR LOWER(source_url) LIKE '%/locator%';
