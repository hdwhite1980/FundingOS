# Notification System Activation Checklist

## ✅ Step 1: Create Notifications Table
**Run in Supabase SQL Editor:**
```sql
-- Copy and paste entire contents of: create_notifications_table.sql
```

This creates:
- `notifications` table with proper schema
- RLS policies for user access
- Indexes for performance
- Updated_at trigger

## ✅ Step 2: Enable Database Triggers
**Run in Supabase SQL Editor:**
```sql
-- Copy and paste entire contents of: create_notification_triggers.sql
```

This enables automatic notifications for:
- ✅ Application status changes
- ✅ New donations received
- ✅ New investments received
- ✅ Campaign milestones (25%, 50%, 75%, 100%)
- ✅ New application submissions

## ✅ Step 3: Create Deadline Reminder Function
**Run in Supabase SQL Editor:**
```sql
-- Copy and paste entire contents of: create_deadline_reminder_function.sql
```

This creates the `check_application_deadlines()` function that sends reminders at 5 days and 1 day before deadlines.

## ⏰ Step 4: Schedule Daily Deadline Checks

### Option A: Using Supabase Edge Functions (Recommended)
1. Create Edge Function in Supabase Dashboard
2. Code:
```typescript
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { error } = await supabase.rpc('check_application_deadlines')
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```
3. Set up Supabase Cron (in Edge Function settings):
   - Schedule: `0 9 * * *` (Daily at 9 AM)

### Option B: Using Vercel Cron Jobs
1. Create `/app/api/cron/check-deadlines/route.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.rpc('check_application_deadlines')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

2. Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/check-deadlines",
    "schedule": "0 9 * * *"
  }]
}
```

3. Add `CRON_SECRET` to environment variables

### Option C: Using pg_cron (if enabled in Supabase)
```sql
SELECT cron.schedule(
  'check-deadlines-daily',
  '0 9 * * *',
  'SELECT check_application_deadlines()'
);
```

## 🧪 Step 5: Test the System

### Test 1: Create a Test Notification
```sql
INSERT INTO public.notifications (user_id, type, title, message, metadata)
VALUES (
  '187c155b-b079-4d5c-bd68-0ce36b99cd2b',
  'system',
  'Test Notification',
  'Testing the notification system',
  jsonb_build_object('test', true)
);
```

Expected: Red dot appears on bell icon in Header

### Test 2: Verify Triggers Work
```sql
-- Test application status change trigger
UPDATE public.submissions
SET status = 'approved'
WHERE id = (SELECT id FROM public.submissions LIMIT 1);
```

Expected: New notification appears: "Your application for [Grant Name] is now approved"

### Test 3: Test Deadline Reminder Function
```sql
SELECT check_application_deadlines();
```

Expected: Notifications created for any applications with deadlines in next 5 days

### Test 4: Verify Header Display
1. Refresh the application
2. Click bell icon
3. Should see notifications with:
   - Correct colors (emerald, amber, blue, slate)
   - "Mark all read" button
   - Click notification → marks as read, color fades
   - Auto-refresh every 30 seconds

### Test 5: Test Campaign Milestone
```sql
-- Update a campaign to trigger milestone
UPDATE public.campaigns
SET raised_amount = goal_amount * 0.5
WHERE id = (SELECT id FROM public.campaigns LIMIT 1);
```

Expected: Notification "Your campaign has reached 50% of its goal!"

## 🔧 Optional: Clean Up Sample Data
If you ran the original SQL with sample notifications:
```sql
-- Run: remove_sample_notifications.sql
```

## 📊 Monitor Notifications

### Check Recent Notifications
```sql
SELECT 
  type,
  title,
  message,
  is_read,
  created_at
FROM public.notifications
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Unread Count
```sql
SELECT COUNT(*) as unread_notifications
FROM public.notifications
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
  AND is_read = false;
```

### Check Notifications by Type
```sql
SELECT 
  type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM public.notifications
WHERE user_id = '187c155b-b079-4d5c-bd68-0ce36b99cd2b'
GROUP BY type
ORDER BY count DESC;
```

## 🤖 Assistant Integration

The WALI-OS Assistant can now send notifications! Use in your code:

```javascript
import { sendAssistantNotification, AssistantNotificationTemplates } from '../lib/assistantNotifications'

// When Assistant finds grants
await sendAssistantNotification(
  userId,
  AssistantNotificationTemplates.grantMatch(3, 2500000, ['grant-1', 'grant-2'])
)

// When Assistant detects issues
await sendAssistantNotification(
  userId,
  AssistantNotificationTemplates.issueDetected('CAGE code missing', 'high')
)
```

See `ASSISTANT_NOTIFICATIONS_GUIDE.md` for full documentation.

## 📝 What's Working Now

✅ **Real-time Notifications**
- Bell icon with unread count badge
- Auto-refresh every 30 seconds
- Click to mark as read
- Color-coded by type

✅ **Automatic Triggers**
- Application status changes
- Donations received
- Investments received
- Campaign milestones
- New submissions

✅ **Assistant Integration**
- Helper functions ready
- Templates for common scenarios
- Can send notifications from Assistant responses

✅ **Deadline Reminders** (when scheduled)
- 5-day warning
- 1-day urgent reminder
- Prevents duplicates

## 🚀 Deployment Status

- ✅ Code deployed to Vercel
- ⏳ Waiting for: Run SQL files in Supabase
- ⏳ Waiting for: Set up cron job for deadline reminders

## 🎯 Next Steps

1. **NOW**: Run the 3 SQL files in Supabase SQL Editor
2. **NOW**: Test creating a notification manually
3. **SOON**: Set up cron job for deadline reminders (Option A, B, or C above)
4. **LATER**: Add Assistant notification sending to key responses (see guide)

---

**Questions?** Check `ASSISTANT_NOTIFICATIONS_GUIDE.md` for detailed documentation.
