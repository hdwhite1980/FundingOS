# Grant Scoring Cache System

## Overview
The FundingOS grant scoring cache system ensures that expensive AI-powered scoring calculations are cached and intelligently invalidated only when necessary changes occur.

## Key Features

### 1. Smart Caching
- Scores are cached in the `project_opportunities` table
- Cache validity: 7 days (configurable)
- Automatic cache hit/miss detection
- Background recalculation when needed

### 2. Intelligent Invalidation
The system automatically invalidates cached scores when significant changes are detected:

#### Project Updates (Per-Project Invalidation)
**Significant fields that trigger invalidation:**
- `name`, `title`, `description`
- `project_category`, `category`
- `funding_request_amount`, `total_project_budget`, `funding_needed`
- `target_population`, `target_population_description`
- `primary_goals`, `expected_outcomes`
- `unique_innovation`, `methodology`, `approach`
- `current_status`, `timeline`
- `geographic_location`, `service_area`
- `matching_funds_available`
- `proposed_start_date`, `funding_decision_needed`

**Minor changes that DON'T trigger invalidation:**
- `updated_at` timestamps
- `created_at` timestamps
- UI-only fields
- Non-scoring related metadata

#### Profile/Company Updates (All User Scores Invalidated)
**Significant fields that trigger invalidation:**
- `organization_type`, `organization_name`
- `small_business`, `woman_owned`, `minority_owned`, `veteran_owned`
- `annual_revenue`, `employee_count`
- `geographic_location`, `service_area`
- `years_operating`, `incorporation_year`
- `certifications`, `registrations`
- `core_capabilities`, `past_experience`

### 3. Automatic Integration
The invalidation system is automatically triggered by:

#### Direct Database Updates
- `directUserServices.projects.updateProject()`
- `directUserServices.profile.updateProfile()`

#### API Endpoints
- `PUT /api/projects/[id]` - Project updates
- `PUT /api/account/profile` - Profile updates

## Usage

### Basic Score Retrieval
```javascript
import scoringCache from './lib/scoringCache.js'

// Get cached score or calculate if needed
const result = await scoringCache.getOrCalculateScore(userId, projectId, opportunityId)
console.log('Score:', result.score, 'Cached:', result.cached)
```

### Manual Cache Management
```javascript
// Force recalculation
const result = await scoringCache.getOrCalculateScore(userId, projectId, opportunityId, true)

// Invalidate specific project scores
await scoringCache.invalidateProjectScores(userId, projectId)

// Invalidate all user scores
await scoringCache.invalidateUserScores(userId)

// Get all cached scores for a project
const scores = await scoringCache.getProjectScores(userId, projectId)
```

### Batch Processing
```javascript
// Calculate scores for multiple opportunities
const results = await scoringCache.batchCalculateScores(
  userId, 
  projectId, 
  [opportunityId1, opportunityId2, opportunityId3]
)
```

## Performance Benefits

### Before Caching
- Every opportunity required fresh AI scoring (2-5 seconds per opportunity)
- Dashboard loads: 30+ seconds for 20 opportunities
- High API costs and rate limiting issues

### With Smart Caching
- Cached scores load instantly (< 100ms)
- Dashboard loads: 1-2 seconds
- 90%+ reduction in AI API calls
- Scores only recalculate when actually needed

## Database Schema

The `project_opportunities` table serves as the scoring cache:

```sql
CREATE TABLE project_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  opportunity_id TEXT NOT NULL,
  fit_score DECIMAL(5,2) DEFAULT 0,
  ai_analysis JSONB,
  status TEXT DEFAULT 'scored',
  score_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id, opportunity_id)
);
```

## Monitoring & Maintenance

### Scoring Performance Metrics
```javascript
const stats = scoringCache.getServiceStats()
console.log('Cache hit rate:', stats.cacheHitRate)
console.log('Average calculation time:', stats.avgCalculationTime)
```

### Cleanup Old Scores
```javascript
// Remove scores older than 30 days
await scoringCache.cleanupOldScores(30)
```

### Health Checks
```javascript
// Test scoring API connectivity
const isHealthy = await scoringCache.testConnection()
```

## Implementation Notes

### Score Validity Logic
```javascript
isScoreValid(cachedRecord) {
  if (!cachedRecord.score_calculated_at) return false
  const daysSinceCalculation = (Date.now() - new Date(cachedRecord.score_calculated_at)) / (1000 * 60 * 60 * 24)
  return daysSinceCalculation < 7 // 7-day validity
}
```

### Error Handling
- Cache invalidation failures don't block updates
- Fallback to fresh calculation if cache is corrupted
- Graceful degradation during API outages

### Thread Safety
- Uses database-level UPSERT for race condition safety
- Atomic operations for cache updates
- No memory-based caching (stateless)

## Future Enhancements

1. **Configurable Cache TTL** - Per-user or per-project cache lifetimes
2. **Selective Field Monitoring** - More granular change detection
3. **Background Refresh** - Proactive score updates before expiry
4. **Analytics** - Track cache performance and optimization opportunities
5. **Webhook Integration** - Real-time invalidation from external systems

## Testing

Use the test script to verify the system:
```bash
node test-score-invalidation.js
```

The test covers:
- Initial score calculation
- Cache hit scenarios  
- Smart invalidation on significant changes
- Cache preservation on minor changes
- Profile update invalidation
- Score recalculation after invalidation