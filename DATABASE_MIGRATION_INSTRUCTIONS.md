# Database Migration Instructions

## Issue Resolution
The errors you're encountering are due to:
1. "data type text has no default operator class for access method 'gin'" - GIN indexes can't be used with TEXT
2. "malformed array literal" - Empty strings being treated as array literals during type conversion

## Solution
We've created multiple scripts to handle these issues safely:

### Step 1: Inspect Current Data
**File:** `inspect_current_data.sql`
- Shows current column types and problematic values
- Helps understand what data needs cleaning
- Run this first to see what we're dealing with

### Step 2: Clean Malformed Data
**File:** `cleanup_malformed_data.sql` 
- Removes empty strings, malformed arrays, and null-like values
- Prepares data for safe type conversion
- Must run before the main migration

### Step 3: Fix Index Conflicts
**File:** `fix_gin_index_error.sql`
- Handles GIN index conflicts during type conversion
- Safely converts ARRAY to TEXT with proper null handling
- Creates appropriate BTREE indexes for TEXT searches

### Step 4: Run Main Migration
**File:** `database_enhanced_ai_discovery.sql`
- Enhanced with simplified, safe type conversion logic
- Adds all required fields for AI-enhanced opportunity discovery
- Creates performance indexes and new tracking tables

## Execution Order

1. **First**, run `inspect_current_data.sql` in Supabase SQL Editor (optional, for visibility)
2. **Second**, run `cleanup_malformed_data.sql` in Supabase SQL Editor
3. **Third**, run `fix_gin_index_error.sql` in Supabase SQL Editor  
4. **Finally**, run `database_enhanced_ai_discovery.sql` in Supabase SQL Editor

## Key Improvements Made

1. **Data Cleaning**: Remove malformed array literals before conversion
2. **Index Conflict Resolution**: Properly drop conflicting GIN indexes before type conversion
3. **Safe Type Conversion**: Simplified logic that defaults to empty arrays for problematic values
4. **Robust Error Handling**: Better error messages and rollback capabilities
5. **Performance Optimization**: Appropriate index types (BTREE for TEXT, GIN for JSONB)

## What Gets Fixed

- ✅ Empty string array literals (`""`)
- ✅ Malformed PostgreSQL arrays (`{}`, `null`)
- ✅ GIN index conflicts during type conversion
- ✅ Safe conversion of ARRAY columns to TEXT
- ✅ Proper indexing for new data types

## Verification

After running all scripts, verify success:

```sql
-- Check that columns have correct types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'opportunities' 
AND column_name IN ('eligibility_criteria', 'project_types');

-- Verify no malformed data remains
SELECT project_types, COUNT(*) 
FROM opportunities 
WHERE project_types IS NOT NULL 
GROUP BY project_types;
```

## Recovery Plan

If anything goes wrong:
1. The scripts include transaction safety
2. Each script can be run independently 
3. You can restore from backup if needed
4. Data cleaning is non-destructive (sets problematic values to NULL)

You should now be able to run the complete migration without array literal or index errors!