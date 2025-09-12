# SAM.gov Automated Sync Schedule

This document outlines the automated synchronization schedule for SAM.gov opportunities, designed to work within non-federal user rate limits (10 requests per day).

## Schedule Overview

**Total Runs per Day:** 9  
**Day Hours:** 7 runs (8 AM - 6 PM ET)  
**Evening Hours:** 2 runs (7 PM - 9 PM ET)  
**Max Requests per Run:** 1 (to stay within daily limit)

## Detailed Schedule

### Daytime Runs (Eastern Time)
- **8:00 AM** - Morning startup sync
- **10:00 AM** - Mid-morning sync  
- **12:00 PM** - Noon sync
- **1:30 PM** - Early afternoon sync
- **3:00 PM** - Mid-afternoon sync
- **4:30 PM** - Late afternoon sync  
- **6:00 PM** - End of business sync

### Evening Runs (Eastern Time)  
- **7:30 PM** - Early evening sync
- **9:00 PM** - Late evening sync

## Implementation Options

### Option 1: Vercel Cron Jobs (Recommended)
Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sam-gov-sync",
      "schedule": "0 8,10,12,13:30,15,16:30,18,19:30,21 * * *"
    }
  ]
}
```

### Option 2: GitHub Actions
Create `.github/workflows/sam-gov-sync.yml`:

```yaml
name: SAM.gov Sync Schedule
on:
  schedule:
    # Runs 9 times per day at specified hours (UTC times)
    - cron: '0 12,14,16,17:30,19,20:30,22,23:30,1 * * *' # Convert to UTC
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger SAM.gov Sync
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            https://your-domain.com/api/cron/sam-gov-sync
```

### Option 3: External Cron Service (cron-job.org, etc.)
Set up 9 separate cron jobs hitting:
`POST https://your-domain.com/api/cron/sam-gov-sync`

With header: `Authorization: Bearer YOUR_CRON_SECRET`

## Rate Limiting Protection

- **Daily Limit:** 10 API requests to SAM.gov
- **Per-Run Limit:** 1 request maximum  
- **Tracking:** Database table `sam_gov_usage` tracks daily usage
- **Auto-Stop:** Sync stops if daily limit reached
- **Reset:** Counters reset at midnight ET

## Environment Variables Required

```env
CRON_SECRET=your-secure-random-secret-here
SAM_GOV_API_KEY=your-sam-gov-api-key
```

## Monitoring

The cron endpoint provides status information:
- `GET /api/cron/sam-gov-sync` - Health check and schedule info
- `POST /api/cron/sam-gov-sync` - Execute sync (requires auth)

Each sync returns:
- Success/failure status
- Number of opportunities imported  
- Current daily usage count
- Next reset time

## Benefits

1. **Compliance:** Stays within SAM.gov non-federal rate limits
2. **Efficiency:** Spreads requests throughout the day
3. **Coverage:** Captures opportunities as they're posted
4. **Reliability:** Built-in error handling and usage tracking
5. **Monitoring:** Clear visibility into sync status and usage