# WALI-OS Assistant Notification Integration Guide

## Overview
The WALI-OS Assistant is now integrated with the notifications system. When the Assistant provides important information, recommendations, or discoveries, it can send notifications to users so they don't miss critical updates.

## How It Works

### 1. Database Triggers (Automatic)
These run automatically when data changes:

- **Application Status Changes** - When status updates (pending → approved)
- **New Donations** - When donations are received  
- **New Investments** - When investments are recorded
- **Campaign Milestones** - At 25%, 50%, 75%, 100% of goal
- **New Applications** - When applications are submitted

### 2. Assistant-Generated Notifications
The Assistant can send notifications when:

- Finding grant opportunities matching user profile
- Detecting issues (missing CAGE code, incomplete profile)
- Providing recommendations
- Completing complex tasks
- Analyzing documents
- Identifying compliance requirements

## Usage in Assistant Code

### Import the Helper

```javascript
import { sendAssistantNotification, AssistantNotificationTemplates } from '../lib/assistantNotifications'
```

### Send Notifications from Assistant

#### Example 1: Grant Matches Found
```javascript
// In contextBuilder.js or assistant route
const matchingGrants = await findMatchingGrants(userId, context)

if (matchingGrants.length > 0) {
  const totalFunding = matchingGrants.reduce((sum, g) => sum + g.amount, 0)
  
  await sendAssistantNotification(
    userId,
    AssistantNotificationTemplates.grantMatch(
      matchingGrants.length,
      totalFunding,
      matchingGrants.map(g => g.id)
    )
  )
}
```

#### Example 2: Issue Detection
```javascript
// When Assistant detects profile is incomplete
if (!context.profile.cage_code) {
  await sendAssistantNotification(
    userId,
    AssistantNotificationTemplates.issueDetected(
      'CAGE code missing from profile',
      'high'
    )
  )
}
```

#### Example 3: Custom Notification
```javascript
await sendAssistantNotification(userId, {
  type: 'system',
  title: 'WALI Assistant Update',
  message: 'I found 3 new grant opportunities that match your projects',
  metadata: {
    action: 'grant_discovery',
    count: 3,
    source: 'grants.gov'
  }
})
```

## Available Notification Templates

### `grantMatch(count, totalFunding, grantIds)`
When Assistant finds matching grants
- Type: `grant_match`
- Includes: count, total funding amount, grant IDs

### `issueDetected(issueName, severity)`  
When Assistant identifies problems
- Type: `system`
- Severity: 'low', 'medium', 'high', 'critical'

### `recommendation(title, message, actionItems)`
When Assistant provides guidance
- Type: `system`
- Includes: action items array

### `taskCompleted(taskName, summary)`
When Assistant finishes complex tasks
- Type: `system`
- Includes: task summary

### `fundingOpportunity(opportunityName, amount, source)`
When Assistant finds new funding
- Type: `funding_opportunity`
- Includes: opportunity details, amount

### `complianceAlert(requirement, deadline)`
When Assistant identifies compliance needs
- Type: `deadline_reminder`
- Includes: requirement, deadline

### `documentAnalysis(documentType, findings)`
After analyzing documents
- Type: `system`
- Includes: analysis findings

## Integration Points

### In `contextBuilder.js`

```javascript
import { sendAssistantNotification, AssistantNotificationTemplates } from './assistantNotifications'

export async function generateAssistantResponse(intent, context, message, userId) {
  // ... existing logic ...
  
  // Send notification for important discoveries
  if (intent === 'opportunity_discovery' && opportunities.length > 0) {
    await sendAssistantNotification(
      userId,
      AssistantNotificationTemplates.fundingOpportunity(
        opportunities[0].title,
        opportunities[0].award_ceiling,
        'grants.gov'
      )
    )
  }
  
  return { success: true, response: responseText, metadata }
}
```

### In `/api/ai/assistant/route.ts`

```javascript
import { sendAssistantNotification, AssistantNotificationTemplates } from '../../../../lib/assistantNotifications'

// After processing response
if (result.metadata?.grants_found > 0) {
  await sendAssistantNotification(
    userId,
    AssistantNotificationTemplates.grantMatch(
      result.metadata.grants_found,
      result.metadata.total_funding,
      result.metadata.grant_ids
    )
  )
}
```

## Best Practices

1. **Don't Spam** - Only send notifications for significant events
2. **Be Specific** - Include actionable information in the message
3. **Use Metadata** - Store extra context in metadata field
4. **Check Duplicates** - Avoid sending the same notification twice
5. **Error Handling** - Wrap in try/catch, don't let notification failures break the flow

## Notification Types

- `grant_match` - New grant opportunities found (emerald color)
- `deadline_reminder` - Deadlines approaching (amber color)  
- `status_update` - Application/submission status changes (blue color)
- `funding_opportunity` - New funding sources (emerald color)
- `system` - General Assistant messages (slate color)

## Testing

### Test Notification Sending
```javascript
// In browser console or test file
const testNotif = await fetch('/api/notifications/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({
    userId: 'user-id-here',
    type: 'system',
    title: 'Test Notification',
    message: 'This is a test from WALI Assistant',
    metadata: { test: true }
  })
})
```

## SQL Files Created

1. `create_notifications_table.sql` - Creates notifications table and RLS policies
2. `create_notification_triggers.sql` - Database triggers for automatic notifications
3. `create_deadline_reminder_function.sql` - Scheduled function for deadline reminders
4. `remove_sample_notifications.sql` - Cleanup script for test data

## Next Steps

1. Run `create_notifications_table.sql` in Supabase SQL Editor
2. Run `create_notification_triggers.sql` to enable automatic notifications
3. Set up cron job to run `check_application_deadlines()` daily
4. Add notification sending logic to key Assistant responses
5. Test with real user interactions

## Monitoring

Check notification activity:
```sql
-- Recent notifications
SELECT * FROM public.notifications 
ORDER BY created_at DESC 
LIMIT 20;

-- Unread count by user
SELECT user_id, COUNT(*) as unread_count
FROM public.notifications
WHERE is_read = false
GROUP BY user_id;

-- Notifications by type
SELECT type, COUNT(*) as count
FROM public.notifications
GROUP BY type
ORDER BY count DESC;
```
