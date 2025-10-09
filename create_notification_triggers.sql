-- Database Triggers for Automatic Notifications

-- 1. Trigger for Application Status Changes
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'status_update',
      'Application Status Update',
      'Your application for ' || COALESCE(NEW.grant_name, 'a grant') || ' is now ' || NEW.status,
      jsonb_build_object(
        'application_id', NEW.id,
        'grant_name', NEW.grant_name,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'amount_requested', NEW.amount_requested,
        'deadline', NEW.deadline
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS application_status_change_notification ON public.submissions;
CREATE TRIGGER application_status_change_notification
  AFTER UPDATE ON public.submissions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_application_status_change();

-- 2. Trigger for New Applications Submitted
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    NEW.user_id,
    'status_update',
    'Application Submitted Successfully',
    'Your application for ' || COALESCE(NEW.grant_name, 'a grant') || ' has been submitted',
    jsonb_build_object(
      'application_id', NEW.id,
      'grant_name', NEW.grant_name,
      'status', NEW.status,
      'amount_requested', NEW.amount_requested,
      'deadline', NEW.deadline,
      'submitted_at', NEW.submission_date
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS new_application_notification ON public.submissions;
CREATE TRIGGER new_application_notification
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  WHEN (NEW.status = 'submitted' OR NEW.status = 'pending')
  EXECUTE FUNCTION notify_new_application();

-- 3. Trigger for New Donations Received
CREATE OR REPLACE FUNCTION notify_new_donation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    NEW.user_id,
    'funding_opportunity',
    'New Donation Received',
    'You received a $' || NEW.amount || ' donation' || COALESCE(' from ' || NEW.donor_name, ''),
    jsonb_build_object(
      'donation_id', NEW.id,
      'amount', NEW.amount,
      'donor_name', NEW.donor_name,
      'campaign_id', NEW.campaign_id,
      'donation_date', NEW.donation_date
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS new_donation_notification ON public.donations;
CREATE TRIGGER new_donation_notification
  AFTER INSERT ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_donation();

-- 4. Trigger for New Investments
CREATE OR REPLACE FUNCTION notify_new_investment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    NEW.user_id,
    'funding_opportunity',
    'New Investment Received',
    'You received a $' || NEW.amount || ' investment' || COALESCE(' from ' || NEW.investor_name, ''),
    jsonb_build_object(
      'investment_id', NEW.id,
      'amount', NEW.amount,
      'investor_name', NEW.investor_name,
      'investment_type', NEW.investment_type,
      'status', NEW.status,
      'investment_date', NEW.investment_date
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS new_investment_notification ON public.investments;
CREATE TRIGGER new_investment_notification
  AFTER INSERT ON public.investments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_investment();

-- 5. Trigger for Campaign Milestones
CREATE OR REPLACE FUNCTION notify_campaign_milestone()
RETURNS TRIGGER AS $$
DECLARE
  milestone_percentage INTEGER;
  goal_amount NUMERIC;
BEGIN
  -- Only check if raised_amount increased
  IF NEW.raised_amount > OLD.raised_amount AND NEW.goal_amount > 0 THEN
    goal_amount := NEW.goal_amount;
    milestone_percentage := FLOOR((NEW.raised_amount / goal_amount) * 100);
    
    -- Notify at 25%, 50%, 75%, 100% milestones
    IF milestone_percentage >= 25 AND (OLD.raised_amount / goal_amount * 100) < 25 THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        NEW.user_id,
        'funding_opportunity',
        'Campaign Milestone Reached',
        'Your campaign "' || NEW.name || '" has reached 25% of its goal!',
        jsonb_build_object(
          'campaign_id', NEW.id,
          'campaign_name', NEW.name,
          'raised_amount', NEW.raised_amount,
          'goal_amount', NEW.goal_amount,
          'milestone', '25%'
        )
      );
    ELSIF milestone_percentage >= 50 AND (OLD.raised_amount / goal_amount * 100) < 50 THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        NEW.user_id,
        'funding_opportunity',
        'Campaign Milestone Reached',
        'Your campaign "' || NEW.name || '" has reached 50% of its goal!',
        jsonb_build_object(
          'campaign_id', NEW.id,
          'campaign_name', NEW.name,
          'raised_amount', NEW.raised_amount,
          'goal_amount', NEW.goal_amount,
          'milestone', '50%'
        )
      );
    ELSIF milestone_percentage >= 75 AND (OLD.raised_amount / goal_amount * 100) < 75 THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        NEW.user_id,
        'funding_opportunity',
        'Campaign Milestone Reached',
        'Your campaign "' || NEW.name || '" has reached 75% of its goal!',
        jsonb_build_object(
          'campaign_id', NEW.id,
          'campaign_name', NEW.name,
          'raised_amount', NEW.raised_amount,
          'goal_amount', NEW.goal_amount,
          'milestone', '75%'
        )
      );
    ELSIF milestone_percentage >= 100 AND (OLD.raised_amount / goal_amount * 100) < 100 THEN
      INSERT INTO public.notifications (user_id, type, title, message, metadata)
      VALUES (
        NEW.user_id,
        'funding_opportunity',
        'Campaign Goal Reached! 🎉',
        'Congratulations! Your campaign "' || NEW.name || '" has reached its goal of $' || NEW.goal_amount,
        jsonb_build_object(
          'campaign_id', NEW.id,
          'campaign_name', NEW.name,
          'raised_amount', NEW.raised_amount,
          'goal_amount', NEW.goal_amount,
          'milestone', '100%'
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_milestone_notification ON public.campaigns;
CREATE TRIGGER campaign_milestone_notification
  AFTER UPDATE ON public.campaigns
  FOR EACH ROW
  WHEN (OLD.raised_amount IS DISTINCT FROM NEW.raised_amount)
  EXECUTE FUNCTION notify_campaign_milestone();

-- Verify triggers were created
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%notification%'
ORDER BY event_object_table, trigger_name;
