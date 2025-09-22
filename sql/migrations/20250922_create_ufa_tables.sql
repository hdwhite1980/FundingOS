-- Migration: create UFA tables

CREATE TABLE IF NOT EXISTS ufa_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  metric_key text NOT NULL,
  value text,
  usage_count bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, metric_key)
);

CREATE TABLE IF NOT EXISTS ufa_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt_count int DEFAULT 0,
  last_attempt timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ufa_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  title text NOT NULL,
  description text,
  progress int DEFAULT 0,
  usage_count bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ufa_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  title text NOT NULL,
  summary text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  due_date timestamptz
);

-- Events table: timeline of UFA analysis runs, decisions, and notable events
CREATE TABLE IF NOT EXISTS ufa_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Useful indexes to speed up tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_ufa_metrics_tenant ON ufa_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ufa_notifications_tenant_status ON ufa_notifications(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ufa_goals_tenant ON ufa_goals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ufa_tasks_tenant_status ON ufa_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ufa_events_tenant_type ON ufa_events(tenant_id, event_type);

-- Helper function: upsert a metric and increment usage_count atomically
CREATE OR REPLACE FUNCTION ufa_upsert_metric(p_tenant_id text, p_metric_key text, p_value text)
RETURNS SETOF ufa_metrics
LANGUAGE plpgsql
AS $$
BEGIN
  LOOP
    -- try update
    UPDATE ufa_metrics
    SET value = p_value, usage_count = COALESCE(usage_count, 0) + 1, updated_at = now()
    WHERE tenant_id = p_tenant_id AND metric_key = p_metric_key
    RETURNING * INTO STRICT FOUND;

    IF FOUND THEN
      RETURN QUERY SELECT * FROM ufa_metrics WHERE tenant_id = p_tenant_id AND metric_key = p_metric_key;
      RETURN;
    END IF;

    -- not found, try insert
    BEGIN
      INSERT INTO ufa_metrics (tenant_id, metric_key, value, usage_count, created_at, updated_at)
      VALUES (p_tenant_id, p_metric_key, p_value, 1, now(), now())
      RETURNING * INTO STRICT FOUND;
      RETURN QUERY SELECT * FROM ufa_metrics WHERE tenant_id = p_tenant_id AND metric_key = p_metric_key;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      -- concurrent insert, loop to try update again
    END;
  END LOOP;
END;
$$;

-- Row Level Security policies for tenant isolation
ALTER TABLE ufa_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ufa_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ufa_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ufa_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ufa_events ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their own tenant's data
CREATE POLICY ufa_metrics_tenant_policy ON ufa_metrics
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id' OR tenant_id = auth.uid()::text);

CREATE POLICY ufa_notifications_tenant_policy ON ufa_notifications
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id' OR tenant_id = auth.uid()::text);

CREATE POLICY ufa_goals_tenant_policy ON ufa_goals
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id' OR tenant_id = auth.uid()::text);

CREATE POLICY ufa_tasks_tenant_policy ON ufa_tasks
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id' OR tenant_id = auth.uid()::text);

CREATE POLICY ufa_events_tenant_policy ON ufa_events
  FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id' OR tenant_id = auth.uid()::text);
