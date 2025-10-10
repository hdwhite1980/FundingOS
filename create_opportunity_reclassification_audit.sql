-- Audit table for admin reclassification actions on opportunities
-- Tracks changes to ai_analysis and ai_categories when toggling monetary/non-monetary classification

create table if not exists opportunity_reclassification_audit (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  opportunity_id uuid not null,
  acted_by_user_id uuid,
  action text not null check (action in ('mark_non_monetary','mark_monetary')),
  reason text,
  previous_ai_analysis jsonb,
  new_ai_analysis jsonb,
  previous_ai_categories text[],
  new_ai_categories text[]
);

-- Optional index to query by opportunity
create index if not exists idx_opp_reclass_audit_opportunity on opportunity_reclassification_audit(opportunity_id);
