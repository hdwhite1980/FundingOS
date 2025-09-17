# RLS Policy Fix for Opportunity Sync Routes

## Problem
The opportunity sync routes were failing with RLS policy violations:
```
code: '42501',
message: 'new row violates row-level security policy (USING expression) for table "opportunities"'
```

## Root Cause
- Sync routes were using the regular Supabase client with anon key
- RLS policies on opportunities table require authenticated users
- Sync operations are backend processes without user sessions

## Solution
Updated all sync routes to use service role client that bypasses RLS:

### Files Modified:
1. `app/api/sync/grants-gov/route.ts`
2. `app/api/sync/sam-gov/route.ts` 
3. `app/api/sync/nih/route.ts`
4. `app/api/sync/nsf/route.ts`
5. `app/api/sync/candid/route.ts`

### Changes Made:
- Added service role client import at top of each file
- Updated opportunity upsert operations to use `supabaseServiceRole`
- Kept regular client for user profile queries
- Added comments explaining RLS bypass

### Service Role Client Configuration:
```typescript
const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

## Result
- Sync operations now bypass RLS policies using service role privileges
- Regular user operations still protected by RLS policies
- Opportunities can be imported by automated sync processes

## Testing
The sync routes should now work without RLS policy violations. To test:
1. Call any sync endpoint (e.g., `/api/sync/grants-gov`)
2. Should see successful opportunity imports
3. No more "42501" RLS policy errors