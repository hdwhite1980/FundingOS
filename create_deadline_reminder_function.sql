-- Function to check for upcoming deadlines and send notifications
-- This should be called daily via a cron job or scheduled function

CREATE OR REPLACE FUNCTION check_application_deadlines()
RETURNS void AS $$
DECLARE
  app_record RECORD;
  days_until_deadline INTEGER;
BEGIN
  -- Check all active/pending applications
  FOR app_record IN 
    SELECT 
      id,
      user_id,
      grant_name,
      deadline,
      amount_requested,
      status
    FROM public.submissions
    WHERE status IN ('pending', 'submitted', 'under_review')
      AND deadline IS NOT NULL
      AND deadline > NOW()
      AND deadline <= NOW() + INTERVAL '5 days'
  LOOP
    -- Calculate days until deadline
    days_until_deadline := EXTRACT(DAY FROM (app_record.deadline - NOW()));
    
    -- Check if we should send a notification
    -- Send at 5 days and 1 day before deadline
    IF days_until_deadline = 5 THEN
      -- Check if notification already sent for this deadline (5-day reminder)
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = app_record.user_id
          AND type = 'deadline_reminder'
          AND metadata->>'application_id' = app_record.id::text
          AND metadata->>'days_remaining' = '5'
          AND created_at > NOW() - INTERVAL '2 days'
      ) THEN
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (
          app_record.user_id,
          'deadline_reminder',
          'Application Deadline Reminder',
          app_record.grant_name || ' application due in 5 days',
          jsonb_build_object(
            'application_id', app_record.id,
            'grant_name', app_record.grant_name,
            'deadline', app_record.deadline,
            'days_remaining', 5,
            'amount_requested', app_record.amount_requested,
            'status', app_record.status
          )
        );
      END IF;
    ELSIF days_until_deadline = 1 THEN
      -- Check if notification already sent for this deadline (1-day reminder)
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = app_record.user_id
          AND type = 'deadline_reminder'
          AND metadata->>'application_id' = app_record.id::text
          AND metadata->>'days_remaining' = '1'
          AND created_at > NOW() - INTERVAL '12 hours'
      ) THEN
        INSERT INTO public.notifications (user_id, type, title, message, metadata)
        VALUES (
          app_record.user_id,
          'deadline_reminder',
          '🚨 Urgent: Application Deadline Tomorrow',
          app_record.grant_name || ' application due tomorrow!',
          jsonb_build_object(
            'application_id', app_record.id,
            'grant_name', app_record.grant_name,
            'deadline', app_record.deadline,
            'days_remaining', 1,
            'amount_requested', app_record.amount_requested,
            'status', app_record.status,
            'urgent', true
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Test the function (will send notifications for any deadlines in next 5 days)
-- SELECT check_application_deadlines();

-- Example: Schedule this function to run daily using pg_cron extension
-- Requires pg_cron extension to be enabled in Supabase
-- SELECT cron.schedule('check-deadlines-daily', '0 9 * * *', 'SELECT check_application_deadlines()');

-- Alternative: Create an Edge Function or API endpoint that calls this function
-- You can then use Vercel Cron Jobs or external services to trigger it daily
