# Opportunities System - File Index

## 📂 Component Files

### Core UI Components
- **`components/OpportunityList.js`** (1081 lines)
  - Main opportunities list with pagination, filtering, eligibility checking
  - Integrates AI scoring, profile completion suggestions
  - Handles lazy loading and performance optimization

- **`components/OpportunityCard.js`**
  - Individual opportunity card display
  - Shows fit score, eligibility status, key details
  - Quick actions (view, save, apply)

- **`components/OpportunityDetailModal.js`**
  - Full opportunity details modal
  - Eligibility analysis display
  - AI recommendations
  - Application materials checklist

- **`components/AngelInvestorOpportunities.js`**
  - Specialized for angel investment opportunities
  - Different criteria and display from grants

- **`components/AIAnalysisModal.js`**
  - Deep AI analysis of opportunity fit
  - Provides detailed recommendations

## 📚 Service/Library Files

### Core Services
- **`lib/supabase.js`** (lines 2960-3210)
  - `opportunityService`: CRUD operations for opportunities
  - `projectOpportunityService`: Manage saved opportunities
  - Eligibility filtering integration
  - Profile completion suggestions

- **`lib/scoringServiceIntegration.js`**
  - AI scoring for opportunity-project fit
  - Caching mechanism
  - Performance optimization

- **`lib/eligibility/grantEligibilityService.js`**
  - Eligibility checking logic
  - Profile completeness analysis
  - Warning and blocker identification

- **`lib/discoveredOpportunities.js`**
  - Opportunity discovery utilities
  - Advanced search capabilities

### Agent/AI Services
- **`services/enhancedUnifiedFundingAgent.js`** (1700+ lines)
  - Multi-channel funding opportunity analysis
  - Strategic recommendations
  - Portfolio optimization
  - Cross-channel synergy identification
  - Seasonal timing recommendations

- **`services/ufaQueryHandler.js`**
  - Query handling for UFA (Unified Funding Agent)
  - Processes natural language queries about opportunities

- **`services/sbaBusinessGuideIntegration.js`**
  - SBA funding programs integration
  - Business guide recommendations

## 🗄️ Database Files

### Schema & Migrations
- **`supabase_schema_commands.sql`**
  - Original schema definition (if present)

- **`quick_schema_fix.sql`**
  - Fixes for project_opportunities table
  - Adds missing columns

- **`quick_migration_add_updated_at.sql`**
  - Adds updated_at column to opportunities
  - Creates auto-update trigger

- **`fix_rls_safe.sql`**
  - RLS policies for opportunities table
  - Security configuration

- **`fix_sponsor_constraint.sql`**
  - Handles sponsor field constraints
  - Allows NULL values if needed

### Inspection & Diagnostic
- **`safe_inspection.sql`**
  - Safe array field inspection
  - Analyzes project_types and eligibility_criteria
  - Checks for data quality issues

- **`inspect_current_data.sql`**
  - Current data inspection
  - Column information
  - Table statistics

- **`quick_database_diagnostic.sql`**
  - Quick health check
  - Table existence verification

## 🧪 Test Files

### Opportunity Testing
- **`test-final-database-operations.js`**
  - Tests opportunities table read/write
  - Tests project_opportunities table
  - RLS verification

- **`test-final-scoring-cache.js`**
  - Scoring cache system tests
  - Performance validation

- **`test-score-invalidation.js`**
  - Score invalidation logic tests

- **`test-grants-sync.js`**
  - Grant sync functionality tests

- **`test-contextual-analysis.js`**
  - Tests AI analysis with opportunities

- **`test-browser-agent.js`**
  - Browser-based agent tests with opportunities

- **`test-browser-profile.js`**
  - Profile-based opportunity filtering tests

- **`test-conversational-agent.js`**
  - Tests conversational AI with opportunities

- **`test-ein-assistant.js`**
  - EIN lookup with opportunities context

- **`test-enhanced-autofill.js`**
  - Auto-fill tests with opportunity data

- **`test-delete-account-functionality.js`**
  - Tests cascading deletes including project_opportunities

## 🌐 API Routes

- **`app/api/angel/opportunities/route.js`**
  - Angel investor opportunities endpoint
  - GET/POST operations

- **`app/api/grants/sync/route.js`** (likely)
  - Grants.gov sync endpoint
  - Daily opportunity imports

## 📊 Related Systems

### Scoring & Caching
- `project_opportunities` table - Caches fit scores
- `scoringServiceIntegration.js` - AI scoring logic
- `SCORING_CACHE_SYSTEM.md` - Documentation

### Eligibility
- `eligibility/grantEligibilityService.js` - Eligibility logic
- Profile completion tracking
- Warning/blocker identification

### Notifications (New)
- Can send notifications when new opportunities match
- Deadline reminders
- See `ASSISTANT_NOTIFICATIONS_GUIDE.md`

### AI Assistant
- Analyzes opportunities for users
- Provides recommendations
- Answers questions about eligibility
- See `ASSISTANT_NOTIFICATIONS_GUIDE.md`

## 🔗 Data Relationships

### Opportunities Connect To:
1. **Projects** (via `project_opportunities`)
   - Users save opportunities to projects
   - Fit scores cached per project-opportunity pair

2. **Applications/Submissions** (via `submissions` table)
   - Track which opportunities have applications
   - Status tracking (draft, submitted, awarded, rejected)

3. **User Profiles** (via eligibility checks)
   - Organization type matching
   - Certification validation
   - Profile completeness affects eligibility

4. **AI Assistant** (via context)
   - Provides opportunity recommendations
   - Answers eligibility questions
   - Analyzes fit

5. **Notifications** (via triggers)
   - New matching opportunities
   - Deadline reminders
   - Status updates

## 📋 Data Sources

### External APIs
1. **Grants.gov**
   - Federal grant opportunities
   - Daily sync via XML/REST API
   - 2000+ active opportunities

2. **SAM.gov**
   - Government contracting
   - Entity registration verification
   - UEI/DUNS lookup

3. **Foundation Directory** (planned)
   - Private foundation grants
   - Corporate giving programs

4. **Angel List / Investment Networks** (partial)
   - Angel investment opportunities
   - Startup funding sources

## 🎯 Quick Reference

### Key Functions
```javascript
// Get opportunities
opportunityService.getOpportunities(filters)

// Get with eligibility
opportunityService.getEligibleOpportunities(userProfile, filters)

// Save to project
projectOpportunityService.saveOpportunity(projectId, opportunityId, fitScore)

// Calculate fit score
scoringService.calculateScore(project, opportunity, userProfile)

// Check eligibility
eligibilityService.checkEligibility(userProfile, opportunity)
```

### Key Database Queries
```sql
-- Get opportunities
SELECT * FROM opportunities WHERE deadline > NOW() LIMIT 20;

-- Get saved opportunities
SELECT o.*, po.fit_score 
FROM opportunities o
JOIN project_opportunities po ON po.opportunity_id = o.id
WHERE po.project_id = $1;

-- Get eligibility stats
SELECT COUNT(*) FROM opportunities 
WHERE 'nonprofit' = ANY(organization_types);
```

### Key Components
```jsx
// Main list
<OpportunityList 
  opportunities={opportunities}
  selectedProject={project}
  userProfile={profile}
  enableEligibilityCheck={true}
/>

// Individual card
<OpportunityCard 
  opportunity={opp}
  fitScore={score}
  eligibility={eligibility}
/>

// Detail modal
<OpportunityDetailModal
  opportunity={opp}
  onClose={() => setShowModal(false)}
/>
```

## 📖 Documentation Files

- **`OPPORTUNITIES_SYSTEM_OVERVIEW.md`** - This overview (comprehensive)
- **`OPPORTUNITIES_FILE_INDEX.md`** - This file (quick reference)
- **`SCORING_CACHE_SYSTEM.md`** - Scoring system details
- **`ASSISTANT_NOTIFICATIONS_GUIDE.md`** - Integration with notifications
- **`schema_analysis.md`** - Database schema analysis

---

**Total Files Related to Opportunities**: ~40+
**Core Components**: 5
**Service Files**: 5+
**Database Files**: 8+
**Test Files**: 15+
**API Routes**: 2+

---

**Need to find something?**
- UI/Display → Check `components/`
- Data/Logic → Check `lib/` and `services/`
- Database → Check `.sql` files
- Tests → Check `test-*.js` files
- Documentation → Check `.md` files
