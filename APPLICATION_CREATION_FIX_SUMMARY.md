# Application Creation Foreign Key Fix - Summary

## Problem
Users were getting this error when creating applications:
```
Failed to generate document: insert or update on table 'submissions' violates foreign key constraint 'submissions_opportunity_id_fkey'
```

## Root Cause
- The `submissions` table has a foreign key constraint requiring `opportunity_id` to reference an existing record in the `opportunities` table
- The application creation form (`CreateSubmissionModal`) was not collecting `opportunity_id`, only `opportunity_title` as a text field
- Many existing submissions had `null` values for `opportunity_id`

## Solution Implemented

### 1. Updated CreateSubmissionModal (ApplicationProgress.js)
- Added opportunity selection dropdown that loads from existing opportunities
- Added fallback manual entry field for custom opportunity titles
- Form now collects both `opportunity_id` (when selected) and `opportunity_title`

### 2. Enhanced Application Creation API (app/api/applications/create/route.js)
- Added logic to handle cases where no `opportunity_id` is provided
- Automatically creates or finds a default opportunity: "Manual Entry - Default Opportunity"
- Ensures every new submission always has a valid `opportunity_id`

### 3. Updated Frontend Application Creation (ApplicationProgress.js)
- Modified `handleCreateSubmission` to use the service role API endpoint
- Ensures proper data validation before submission

## Files Modified
1. `/components/ApplicationProgress.js` - Updated modal and submission handling
2. `/app/api/applications/create/route.js` - Enhanced API with auto-opportunity creation
3. `/lib/supabase.js` - Updated to use new service role API endpoint

## Testing
- Created test page at `/test-application` to verify the fix works
- Test creates applications without opportunity_id to ensure auto-creation works
- Should see successful creation without foreign key errors

## Expected Behavior
1. New applications can be created with or without selecting an existing opportunity
2. If no opportunity is selected, a default one is automatically created/used
3. No more foreign key constraint violations
4. Legacy applications with null opportunity_id will be handled by the auto-creation logic when similar records are created

## Legacy Data
- Existing submissions with null opportunity_id will remain as-is
- They don't cause immediate issues but should be cleaned up in a future maintenance task
- The auto-creation logic prevents any new null values

## Next Steps for User
1. Test the application creation in the main app
2. Go to Applications → Track New Application
3. Try creating applications both with and without selecting opportunities
4. Verify no foreign key errors occur
5. Check that submissions are created successfully