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
