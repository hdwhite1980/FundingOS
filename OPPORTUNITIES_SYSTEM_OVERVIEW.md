# Opportunities System - Complete Overview

## 📊 Database Schema

### `opportunities` Table
The opportunities table stores grant and funding opportunities from various sources:

**Core Fields:**
- `id` (UUID) - Primary key
- `title` (TEXT) - Opportunity title
- `description` (TEXT) - Full description
- `opportunity_number` (TEXT) - External reference number
- `sponsor` (TEXT) - Funding agency/organization
- `amount_min` (NUMERIC) - Minimum award amount
- `amount_max` (NUMERIC) - Maximum award amount  
- `deadline` (TIMESTAMPTZ) - Application deadline
- `post_date` (TIMESTAMPTZ) - When opportunity was posted
- `created_at` (TIMESTAMPTZ) - Record creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Classification Fields:**
- `organization_types` (TEXT[]) - Array of eligible org types (nonprofit, for-profit, government, etc.)
- `project_types` (TEXT[]) - Array of project categories
- `eligibility_criteria` (TEXT[]) - Array of eligibility requirements
- `category` (TEXT) - Primary category
- `cfda_number` (TEXT) - Catalog of Federal Domestic Assistance number

**Additional Fields:**
- `source` (TEXT) - Data source (grants.gov, sam.gov, etc.)
- `opportunity_url` (TEXT) - Link to full opportunity details
- `contact_info` (JSONB) - Contact information
- `attachments` (JSONB) - Related documents
- `metadata` (JSONB) - Additional flexible data

**RLS Policies:**
- All authenticated users can view opportunities (shared data)
- Authenticated users can insert opportunities (for syncs)
- Authenticated users can update opportunities

---

## 📁 File Structure

### Core Components

#### 1. **OpportunityList.js** (`components/OpportunityList.js`)
Main list view component with advanced features:
- **Pagination**: 20 opportunities per page
- **AI Scoring**: Calculates fit scores for current + next page (40 opportunities)
- **Filtering System**:
  - Basic: deadline type, amount range, organization type
  - Eligibility: only eligible, exclude warnings, min confidence, show ineligible
- **Profile Completion**: Shows suggestions to improve eligibility
- **Features**:
  - Toggle eligibility check on/off
  - AI analysis modal for detailed recommendations
  - Opportunity detail modal
  - Real-time scoring
  - Lazy loading for performance

**Key State:**
```javascript
const [filters, setFilters] = useState({
  deadlineType: 'all',
  amountRange: 'all',
  organizationType: 'all',
  onlyEligible: false,
  excludeWarnings: false,
  minConfidence: 50,
  showIneligible: true,
  smallBusinessOnly: false
})
```

#### 2. **OpportunityCard.js** (`components/OpportunityCard.js`)
Individual opportunity card display:
- Shows title, sponsor, amounts, deadline
- Displays fit score with color coding (red < 60, yellow 60-79, green >= 80)
- Eligibility badges (eligible, warnings, ineligible)
- Quick actions (view details, apply)
- Responsive design with truncated descriptions

#### 3. **OpportunityDetailModal.js** (`components/OpportunityDetailModal.js`)
Full opportunity details modal:
- Complete description and requirements
- Eligibility analysis with detailed reasoning
- AI recommendations
- Contact information
- Important dates
- Application materials checklist
- Direct links to apply

#### 4. **AngelInvestorOpportunities.js** (`components/AngelInvestorOpportunities.js`)
Specialized component for angel investment opportunities:
- Different from grant opportunities
- Connects startups with angel investors
- Investment-specific fields and criteria

---

## 🔧 Services & APIs

### OpportunityService (`lib/supabase.js`)

```javascript
export const opportunityService = {
  // Get opportunities with filtering
  async getOpportunities(filters = {}) {
    // Filters: organizationType, minAmount, maxAmount
    // Returns up to 200 opportunities
  },

  // Get opportunities with eligibility checking
  async getEligibleOpportunities(userProfile, filters = {}) {
    // Applies GrantEligibilityService filtering
    // Filters: onlyEligible, excludeWarnings, minConfidence
    // Returns filtered opportunities with eligibility scores
  },

  // Get profile completion suggestions
  async getProfileCompletionSuggestions(userProfile) {
    // Returns array of missing fields that affect eligibility
  }
}
```

### ProjectOpportunityService (`lib/supabase.js`)

```javascript
export const projectOpportunityService = {
  // Get saved opportunities for a project
  async getProjectOpportunities(projectId) {
    // Returns opportunities linked to specific project
    // Includes cached fit scores
  },

  // Save opportunity to project
  async saveOpportunity(projectId, opportunityId, fitScore) {
    // Creates project_opportunities record
    // Caches fit score for performance
  },

  // Remove opportunity from project
  async removeOpportunity(projectId, opportunityId) {
    // Deletes project_opportunities record
  }
}
```

---

## 🎯 Scoring System

### Scoring Service Integration (`lib/scoringServiceIntegration.js`)

**Score Calculation:**
```javascript
scoringService.calculateScore(project, opportunity, userProfile)
```

**Caching Strategy:**
- Scores cached in `project_opportunities` table
- Only recalculates when project changes
- Prevents redundant AI calls
- Dramatically improves performance

**Score Breakdown:**
- **0-59**: Red - Poor fit
- **60-79**: Yellow - Moderate fit  
- **80-100**: Green - Excellent fit

**Scoring Factors:**
1. Project alignment with opportunity categories
2. Budget match (project funding goal vs opportunity amounts)
3. Organization type eligibility
4. Past performance and capacity
5. Geographic alignment
6. Timeline feasibility

---

## 🔍 Eligibility System

### GrantEligibilityService (`lib/eligibility/grantEligibilityService.js`)

**Features:**
- Analyzes user profile completeness
- Checks organization type eligibility
- Validates small business status
- Assesses required certifications
- Identifies warnings and blockers

**Eligibility Response Structure:**
```javascript
{
  eligible: true/false,
  score: 0-100,
  warnings: ['Missing DUNS', 'No SAM registration'],
  blockers: ['Wrong organization type'],
  suggestions: ['Complete CAGE code', 'Register in SAM.gov'],
  confidence: 85
}
```

---

## 📦 Related Tables

### `project_opportunities` Table
Junction table linking projects to opportunities:
- `project_id` (UUID FK)
- `opportunity_id` (UUID FK)  
- `fit_score` (NUMERIC) - Cached AI score
- `notes` (TEXT) - User notes
- `status` (TEXT) - saved, applied, awarded, rejected
- `created_at` (TIMESTAMPTZ)

**Purpose:**
- Save interesting opportunities
- Cache scoring results
- Track application status
- Store user notes

---

## 🔄 Data Sync

### Grants.gov Integration
- Daily sync of federal opportunities
- Endpoint: `/api/grants/sync`
- Imports new opportunities automatically
- Updates existing records
- Parses XML/JSON feeds

### SAM.gov Integration  
- Government contracting opportunities
- Entity verification data
- UEI/DUNS lookup

---

## 🎨 UI Features

### Filter Sidebar
- **Deadline Filters**: All, Upcoming (< 30 days), Rolling
- **Amount Filters**: All, Small (< $50K), Medium ($50K-$250K), Large (> $250K)
- **Organization Type**: Nonprofit, For-profit, Government, Educational, etc.
- **Eligibility Filters**: 
  - Only Eligible checkbox
  - Exclude Warnings checkbox
  - Min Confidence slider (50-100)
  - Show Ineligible toggle
  - Small Business Only checkbox

### Eligibility Settings Panel
- Toggle entire eligibility system on/off
- Adjust confidence thresholds
- Profile completion progress bar
- Missing field suggestions with links

### AI Analysis Modal
- Detailed fit analysis
- Strengths and weaknesses
- Improvement recommendations
- Competitive assessment
- Application strategy tips

---

## 📊 Data Flow

### Loading Opportunities
```
1. User selects project in dropdown
2. OpportunityList calls opportunityService.getOpportunities()
3. If eligibility enabled: applies GrantEligibilityService filtering
4. Applies user filter preferences
5. Paginates results (20 per page)
6. Calculates AI scores for visible opportunities (current + next page)
7. Renders OpportunityCard components
8. Shows eligibility badges and fit scores
```

### Viewing Details
```
1. User clicks "View Details" on OpportunityCard
2. Opens OpportunityDetailModal with full data
3. Shows eligibility analysis
4. Displays AI recommendations
5. Provides application materials checklist
6. Links to external opportunity page
```

### Saving Opportunities
```
1. User clicks "Save" on OpportunityCard
2. Calls projectOpportunityService.saveOpportunity()
3. Creates project_opportunities record
4. Caches current fit score
5. Updates UI to show "Saved" state
6. Adds to user's saved opportunities list
```

---

## 🐛 Known Issues

### Array Field Handling
- `project_types` and `eligibility_criteria` stored as TEXT[]
- Some records have empty arrays `{}`
- Some have double quotes `""`
- Filtering requires careful array operations
- Fixed with safe inspection queries (see `safe_inspection.sql`)

### Performance Considerations
- Scoring 200 opportunities takes ~30 seconds
- Implemented lazy scoring (only visible + next page)
- Cached scores in database
- Pagination reduces initial load time
- Consider background job for bulk scoring

---

## 📝 SQL Queries

### Get Opportunities with Filters
```sql
SELECT *
FROM opportunities
WHERE organization_types && ARRAY['nonprofit']
  AND amount_max >= 50000
  AND deadline > NOW()
ORDER BY deadline ASC
LIMIT 20;
```

### Get Saved Opportunities for Project
```sql
SELECT 
  o.*,
  po.fit_score,
  po.notes,
  po.status,
  po.created_at as saved_at
FROM opportunities o
JOIN project_opportunities po ON po.opportunity_id = o.id
WHERE po.project_id = $1
ORDER BY po.created_at DESC;
```

### Get Eligibility Stats
```sql
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE 'nonprofit' = ANY(organization_types)) as nonprofit_eligible,
  COUNT(*) FILTER (WHERE amount_max >= 100000) as large_awards,
  COUNT(*) FILTER (WHERE deadline > NOW() + INTERVAL '30 days') as upcoming
FROM opportunities;
```

---

## 🚀 Future Enhancements

### Planned Features
1. **Smart Recommendations**: AI suggests best opportunities for each project
2. **Deadline Notifications**: Email/SMS reminders before deadlines
3. **Application Templates**: Pre-filled forms based on opportunity requirements
4. **Success Predictions**: ML model predicts award probability
5. **Collaborative Features**: Team comments and assignments
6. **Advanced Search**: Natural language queries ("renewable energy grants under $100K")
7. **Saved Searches**: Alert when new matching opportunities posted
8. **Grant Calendar**: Visual timeline of all deadlines
9. **Matching Algorithm**: Automatic pairing of projects with best opportunities
10. **Historical Analysis**: Learn from past applications to improve future ones

---

## 📚 Related Documentation

- `SCORING_CACHE_SYSTEM.md` - Score caching implementation
- `safe_inspection.sql` - Array field inspection queries
- `ASSISTANT_NOTIFICATIONS_GUIDE.md` - Notification integration for opportunities
- Grant sync documentation (if exists)
- Eligibility service documentation (if exists)

---

## 🔑 Key Takeaways

1. **Opportunities are shared data** - All users see same opportunities, filtered by their criteria
2. **Scoring is expensive** - Only calculate for visible opportunities, cache results
3. **Eligibility is complex** - Multiple factors affect whether org can apply
4. **Performance matters** - Pagination, lazy loading, caching are essential
5. **User experience** - Make it easy to find relevant opportunities quickly
6. **Data quality** - Keep opportunities data fresh and accurate through syncs
7. **Integration** - Opportunities connect to projects, applications, notifications, AI assistant

---

**Last Updated**: October 9, 2025
