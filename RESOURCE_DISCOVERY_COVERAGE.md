# Resource Discovery Coverage Analysis

## Your Requirements vs Current Implementation

### ✅ FULLY COVERED Resource Types:

1. **Mentorship** ✓
   - Search terms: `mentorship program`, `coaching program`, `mentorship program {year}`
   - AI Categories: `mentorship`

2. **Training** ✓
   - Search terms: `workshops and training`, `training vouchers`, `certification vouchers`
   - AI Categories: `training`

3. **Facility Access** ✓
   - Search terms: `lab access`, `facility access`, `workspace access`, `coworking space for nonprofits`
   - AI Categories: `facility_access`

4. **Equipment** ✓
   - Search terms: `equipment donation`, `hardware donation`, `device donation`, `tooling donation`, `equipment loaner program`, `equipment donation {year}`
   - AI Categories: `equipment`

5. **Services** ✓
   - Search terms: `donated services`, `professional services donation`, `pro bono consulting`, `pro bono services {year}`, `technical assistance program`, `implementation support`, `support plan donation`
   - AI Categories: `services`

6. **In-Kind** ✓
   - Search terms: `in-kind support`, `donated services`, `in-kind donations`
   - AI Categories: `in_kind`

7. **Software Grant** ✓
   - Search terms: `software grant`, `software donation`, `donated licenses`, `software donation program {year}`
   - Plus specific programs: `Microsoft 365 nonprofit`, `Office 365 nonprofit`, `GitHub for nonprofits`, `Salesforce nonprofit program`, `Tableau for nonprofits`, `Adobe for nonprofits`, `Autodesk nonprofit`
   - AI Categories: `software_grant`

8. **Cloud Credits** ✓
   - Search terms: `cloud credits`, `compute credits`, `GPU credits`, `Azure credits`, `AWS credits`, `Google Cloud credits`, `OpenAI credits`, `Hugging Face credits`
   - AI Categories: `cloud_credits`

9. **Data Credits** ✓
   - Search terms: `data credits`
   - AI Categories: `data_credits`

10. **Ad Credits** ✓
    - Search terms: `advertising credits`
    - AI Categories: `ad_credits`

11. **Incubator** ✓
    - Search terms: `incubator program no equity`, `non-dilutive accelerator services`
    - AI Categories: `incubator`

12. **Accelerator** ✓
    - Search terms: `accelerator program services only`, `non-dilutive accelerator services`
    - AI Categories: `accelerator`

## Additional Resource Types Covered:

- **Capacity Building**: `capacity building`
- **Technical Assistance**: `technical assistance program`, `implementation support`
- **Pro Bono Consulting**: `pro bono consulting`, `professional services donation`

## How It Works:

### 1. AI Web Discovery (lib/ai-enhanced-opportunity-discovery.js)
When `resourceOnly=true`, the system:
- Generates 30+ targeted search queries combining base query + resource terms
- Searches with Serper API for broader coverage (20 queries instead of 15)
- Uses all the resource search terms listed above

### 2. Database Query (app/api/sync/ai-discovery/route.ts)
When checking cached results:
```typescript
if (params.resourceOnly) {
  query = query.overlaps('ai_categories', [
    'resources', 
    'non_monetary', 
    'in_kind', 
    'software_grant', 
    'cloud_credits'
  ])
}
```

**⚠️ ISSUE FOUND**: The database cache query only checks for 5 categories, missing:
- `data_credits`
- `ad_credits`
- `mentorship`
- `training`
- `facility_access`
- `equipment`
- `services`
- `incubator`
- `accelerator`

### 3. UI Query (components/OpportunityList.js) - ✅ FIXED
Now searches for all 14 resource categories:
```javascript
aiCategories: [
  'resources', 'non_monetary', 'in_kind', 
  'software_grant', 'cloud_credits', 'data_credits', 'ad_credits',
  'mentorship', 'training', 'facility_access', 'equipment', 'services',
  'incubator', 'accelerator'
]
```

## Recommendations:

### 1. Update Database Cache Query
The `queryExistingFromDB` function in `app/api/sync/ai-discovery/route.ts` should check for all 14 categories to properly match cached resources.

### 2. All Discovery Paths Now Aligned
- ✅ AI Web Search: Uses comprehensive resource terms
- ⚠️ Database Cache: Needs update to check all 14 categories  
- ✅ UI Display: Searches for all 14 categories
- ✅ Server Filtering: Recognizes all 14 categories

## Summary:

**AI Discovery Search Terms**: ✅ COMPREHENSIVE - Covers all 12 requested resource types plus additional valuable ones

**Issue**: The database cache check in the API route is too restrictive and may miss cached resources with categories like `mentorship`, `training`, `equipment`, etc.

**Solution**: Update line 90 in `app/api/sync/ai-discovery/route.ts` to include all 14 resource categories.
