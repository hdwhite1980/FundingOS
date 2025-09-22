# UFA Migration Guide

## Overview
This migration fixes the UFA (Unified Funding Agent) schema to resolve type mismatches and enable proper RLS policies.

## Problem
- UFA tables have `tenant_id` as `text` but RLS policies expect `uuid` (to match `auth.uid()`)
- API endpoint `/api/ufa/intelligence` returns 500 due to policy creation failures

## Solution
Run `sql/migrations/ufa_type_fix.sql` in Supabase SQL Editor to:
1. Drop existing policies that block type changes
2. Convert `tenant_id` from `text` to `uuid` in all UFA tables
3. Recreate RLS policies with proper type matching
4. Add service role policies for backend operations

## Steps
1. Open Supabase Dashboard → SQL Editor
2. Paste contents of `sql/migrations/ufa_type_fix.sql`
3. Click "Run" - it will show progress messages
4. Verify results with the included verification queries

## Verification
After running the migration:

```sql
-- Check column types are now uuid
SELECT table_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND column_name='tenant_id'
ORDER BY table_name;
```

```bash
# Test the intelligence API (replace TENANT_UUID with real user id)
curl "https://your-app.vercel.app/api/ufa/intelligence?tenantId=TENANT_UUID"
# Should return 200 with dashboard data
```

## Tables Affected
- `ufa_goals` - Strategic goals and progress tracking
- `ufa_tasks` - Decisions and action items
- `ufa_metrics` - Performance metrics and KPIs
- `ufa_events` - Analysis events and logs
- `ufa_notifications` - Email queue for strategic updates
- `tenant_settings` - Organization configuration
- `profiles` - Ensures tenant_id exists and is uuid

## Environment Variables Needed
Set these in Vercel for full UFA functionality:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
SENDGRID_API_KEY=sg.your_sendgrid_key (optional)
SENDGRID_FROM_EMAIL=noreply@yourdomain.com (optional)
```

## Troubleshooting
- If migration fails partway: Policies are idempotent, safe to re-run
- If `tenant_settings` doesn't exist: Migration will skip it safely
- If some tenant_id values are invalid: Migration nulls them before conversion