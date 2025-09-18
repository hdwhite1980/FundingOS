-- User notification preferences for AI email events
create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ai_analysis_complete boolean not null default false,
  new_match_found boolean not null default false,
  match_threshold numeric not null default 0.75,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_user_notification_preferences()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_touch_user_notification_preferences
before update on public.user_notification_preferences
for each row execute procedure public.touch_user_notification_preferences();
