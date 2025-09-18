-- Password reset codes table
-- Stores hashed 6-digit codes with expiry (10 min) and single-use semantics
create table if not exists public.password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint valid_expiry check (expires_at > created_at)
);

create index if not exists idx_password_reset_codes_user_id on public.password_reset_codes(user_id);
create index if not exists idx_password_reset_codes_expires_at on public.password_reset_codes(expires_at);

-- Optional: cleanup policy suggestion (manual or cron)
-- delete from public.password_reset_codes where (expires_at < now() - interval '1 hour') or consumed_at is not null;
