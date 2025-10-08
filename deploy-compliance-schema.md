# Deploy Compliance Schema to Supabase

## Quick Deployment Guide

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your **FundingOS** project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Execute Schema
1. Click **New Query**
2. Copy the **entire contents** of `create_compliance_database_schema.sql`
3. Paste into the SQL Editor
4. Click **Run** or press `Ctrl+Enter`

### Step 3: Verify Installation
At the end of the script, you'll see verification queries that will output:

```sql
-- Should show: COMPLIANCE TABLES CREATED | table_count: 8
-- Should show: DEFAULT RULES INSERTED | rule_count: 8
-- Should show: 8 compliance rules listed
```

### Step 4: Test API Endpoint
Once deployed, test the API:

```bash
# In PowerShell terminal:
curl http://localhost:3000/api/compliance?userId=YOUR_USER_ID
```

Or open your browser's DevTools Network tab and navigate to `/ufa` → Compliance tab.

---

## What Gets Created

### 8 Database Tables:
1. ✅ `compliance_tracking` - Track requirements and deadlines
2. ✅ `compliance_documents` - Manage documents and expiration
3. ✅ `compliance_recurring` - Handle recurring tasks
4. ✅ `compliance_history` - Log compliance checks
5. ✅ `compliance_preferences` - User alert settings
6. ✅ `compliance_rules` - Compliance rule templates
7. ✅ `compliance_alerts` - Alert notifications
8. ✅ `compliance_analytics` - Metrics over time

### Security Features:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ User-specific policies (users can only see their own data)
- ✅ System policies for automated processes

### Performance:
- ✅ Indexes on user_id, status, dates
- ✅ GIN indexes for JSONB columns
- ✅ Optimized for fast queries

### Pre-loaded Data:
8 default compliance rules including:
- Grant reporting (quarterly)
- Tax filing (annual)
- SBA size certification
- DUNS registration
- SAM.gov registration
- Workers compensation renewal
- General liability renewal
- Audit preparation

---

## Troubleshooting

### Error: "relation already exists"
**Solution**: Tables are already deployed! You're good to go.

### Error: "permission denied"
**Solution**: 
1. Make sure you're using the SQL Editor in Supabase Dashboard (not a direct psql connection)
2. Verify you're logged into the correct project
3. Check that you have admin access to the project

### Error: "auth.users does not exist"
**Solution**: This shouldn't happen in Supabase, but if it does:
1. Make sure you're running this in a Supabase project (not a generic PostgreSQL)
2. Verify authentication is enabled in your project

---

## After Deployment

### Test the Integration:
1. **Start dev server** (if not running):
   ```powershell
   npm run dev
   ```

2. **Navigate to UFA page**:
   - Go to http://localhost:3000/ufa
   - Log in if needed
   - Click **Compliance** tab

3. **Test Dashboard**:
   - ✅ Page should load without errors
   - ✅ Stat cards should show "0" values (no data yet)
   - ✅ Forms should be visible

4. **Test Creating Items**:
   - Fill out "Add new compliance task" form
   - Click "Add tracking item"
   - Item should appear in list above

5. **Test Compliance Check**:
   - Click "Run compliance check" button
   - Should see updated stats and compliance score

6. **Test Assistant**:
   - Open WALI-OS Assistant (if available on page)
   - Ask: "What's my compliance status?"
   - Should see formatted response with status, score, and alerts

---

## Production Deployment

When deploying to production:

1. ✅ Schema is already deployed to Supabase (cloud hosted)
2. ✅ Code is pushed to GitHub
3. ✅ Deploy your Next.js app (Vercel, etc.)
4. ✅ Ensure environment variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

**Ready?** Copy the contents of `create_compliance_database_schema.sql` and paste it into Supabase SQL Editor!
