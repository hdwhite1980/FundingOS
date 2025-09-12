# Database Changes Required for Enhanced Onboarding and Project Creation

## Summary
The enhanced onboarding and project creation flows require significant database schema updates to store all the comprehensive information being collected.

## Critical Changes Needed

### 1. User Profiles Table Additions
The current `user_profiles` table has basic fields (full_name, organization_name, organization_type) but needs **36 additional fields** for comprehensive onboarding:

**Organization Details:**
- phone, website, address fields (7 fields)
- organization_type_other (for "other" selections)

**Legal & Compliance:**
- legal_structure, incorporation_year, ein, duns_uei
- sam_registration, irs_status, special_certifications (array)

**Organizational Capacity:**
- years_operating, staff counts (full_time_staff, part_time_staff, volunteers)
- board_members, previous_awards

**Financial Health:**
- annual_budget, funding_sources (array), audit_status
- indirect_cost_rate, indirect_rate_type

**Program Areas:**
- primary_focus_areas (array), populations_served (array)
- geographic_service_area, mission_statement

**Team & Leadership:**
- leadership_experience, board_diversity, key_partnerships

**Funding Preferences:**
- preferred_funding_types (array), typical_award_size
- grant_writing_capacity, compliance_capacity, risk_tolerance

### 2. Projects Table Additions
The current `projects` table needs **35 additional fields** for comprehensive project creation:

**Project Categorization:**
- project_category, project_category_other

**Scope & Impact:**
- target_population_description, estimated_people_served
- project_location, proposed_start_date, project_duration, key_milestones

**Budget Breakdown:**
- total_project_budget, percentage breakdowns (5 fields)
- funding_request_amount, cash_match_available, in_kind_match_available

**Project Readiness:**
- current_status, project_director_status, key_staff_status
- collaborating_organizations, partnership_mous, partnership_role

**Outcomes & Evaluation:**
- primary_goals (array), output_measures, outcome_measures
- impact_measures, evaluation_plan

**Funding Strategy:**
- preferred_funding_types (array), funding_decision_needed
- latest_useful_start, urgency_level, sustainability_plan, other_funding_sources

**Innovation & Differentiation:**
- unique_innovation, evidence_base, strategic_fit

## Impact Assessment

### 📊 **Data Completeness**
- **Current State**: Basic profiles with ~5-10 fields
- **Enhanced State**: Comprehensive profiles with ~45+ fields
- **Impact**: Much better grant matching and application quality

### ⚡ **Performance Considerations**
- **New Indexes**: 15+ indexes needed for optimal query performance
- **Array Fields**: 8 new array fields requiring GIN indexes
- **Storage**: Modest increase (~2-5KB per profile/project)

### 🔄 **Migration Safety**
- All new fields are nullable (except where defaults provided)
- Existing data preserved and unaffected
- Graceful fallbacks for missing data in components

### 🎯 **Compatibility**
- **Existing Code**: Will continue to work (using existing fields)
- **New Features**: Will populate new fields progressively
- **API Endpoints**: Need updates to handle new field sets

## Action Items

### Immediate (Required for new features):
1. **Run the database update script** (`database_enhanced_onboarding_projects.sql`)
2. **Verify all indexes were created** properly
3. **Test existing functionality** still works

### Short-term (Recommended):
1. **Update API documentation** to reflect new fields
2. **Add data validation** for critical fields (EIN format, etc.)
3. **Create data migration utilities** for existing users

### Optional Enhancements:
1. **Add database constraints** for data integrity
2. **Create backup/restore procedures** for enhanced data
3. **Add audit logging** for sensitive compliance fields

## Database Script Location
The complete database update script is located at:
`/database_enhanced_onboarding_projects.sql`

This script safely adds all required fields with proper error handling and compatibility checks.

## Verification
After running the script, verify with these queries:

```sql
-- Check user_profiles new fields
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name LIKE '%funding%';

-- Check projects new fields  
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name LIKE '%percentage%';

-- Check new indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('user_profiles', 'projects') 
AND indexname LIKE 'idx_%';
```

## Risk Assessment
- **Risk Level**: Low (additive changes only)
- **Rollback**: Simple (drop new columns if needed)
- **Testing**: Can test with existing data safely