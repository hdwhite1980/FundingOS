-- UFA Schema Type Fix Migration
-- Fixes tenant_id type mismatch (text -> uuid) and RLS policies
-- Run this in Supabase SQL Editor

begin;

-- 0) Ensure profiles.tenant_id exists and is uuid
alter table if exists public.profiles
  add column if not exists tenant_id uuid;
update public.profiles set tenant_id = id where tenant_id is null;

-- 1) Drop ALL existing policies on UFA tables to allow type changes
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('ufa_goals','ufa_tasks','ufa_metrics','ufa_events','ufa_notifications','tenant_settings')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    raise notice 'Dropped policy % on %.%', r.policyname, r.schemaname, r.tablename;
  end loop;
end $$;

-- 2) Clean up invalid tenant_id values before casting to uuid (cast to text for regex)
update public.ufa_goals         set tenant_id = null where tenant_id is not null and tenant_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
update public.ufa_tasks         set tenant_id = null where tenant_id is not null and tenant_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
update public.ufa_metrics       set tenant_id = null where tenant_id is not null and tenant_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
update public.ufa_events        set tenant_id = null where tenant_id is not null and tenant_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
update public.ufa_notifications set tenant_id = null where tenant_id is not null and tenant_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3) Convert tenant_id columns from text to uuid
alter table if exists public.ufa_goals         alter column tenant_id type uuid using tenant_id::uuid;
alter table if exists public.ufa_tasks         alter column tenant_id type uuid using tenant_id::uuid;
alter table if exists public.ufa_metrics       alter column tenant_id type uuid using tenant_id::uuid;
alter table if exists public.ufa_events        alter column tenant_id type uuid using tenant_id::uuid;
alter table if exists public.ufa_notifications alter column tenant_id type uuid using tenant_id::uuid;

-- Convert tenant_settings if it exists and isn't already uuid
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tenant_settings'
      and column_name='tenant_id' and data_type <> 'uuid'
  ) then
    update public.tenant_settings set tenant_id = null 
      where tenant_id is not null and tenant_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    execute 'alter table public.tenant_settings alter column tenant_id type uuid using tenant_id::uuid';
  end if;
end $$;

-- 4) Enable RLS on all UFA tables
alter table public.ufa_goals enable row level security;
alter table public.ufa_tasks enable row level security;
alter table public.ufa_metrics enable row level security;
alter table public.ufa_events enable row level security;
alter table public.ufa_notifications enable row level security;
alter table if exists public.tenant_settings enable row level security;

-- 5) Create read policies for authenticated users (tenant_id = auth.uid())
create policy read_own_goals on public.ufa_goals
  for select using (tenant_id = auth.uid());
create policy read_own_tasks on public.ufa_tasks
  for select using (tenant_id = auth.uid());
create policy read_own_metrics on public.ufa_metrics
  for select using (tenant_id = auth.uid());
create policy read_own_events on public.ufa_events
  for select using (tenant_id = auth.uid());
create policy read_own_notifications on public.ufa_notifications
  for select using (tenant_id = auth.uid());

-- Create tenant_settings table if it doesn't exist
create table if not exists public.tenant_settings (
  tenant_id uuid primary key,
  notification_emails text[] not null default '{}',
  org_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optional: Allow users to read their tenant settings (skip if exists)
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='tenant_settings' and policyname='read_own_settings') then
    create policy read_own_settings on public.tenant_settings
      for select using (tenant_id = auth.uid());
  end if;
end $$;

-- 6) Service role policies (service_role bypasses RLS, but explicit is cleaner)
create policy service_write_goals on public.ufa_goals
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy service_write_tasks on public.ufa_tasks
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy service_write_metrics on public.ufa_metrics
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy service_write_events on public.ufa_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy service_write_notifications on public.ufa_notifications
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='tenant_settings') then
    if not exists (select 1 from pg_policies where schemaname='public' and tablename='tenant_settings' and policyname='service_write_settings') then
      create policy service_write_settings on public.tenant_settings
        for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
    end if;
  end if;
end $$;

-- 7) Ensure the upsert RPC exists (used by enhanced UFA service)
create or replace function public.ufa_upsert_metric(
  p_tenant_id uuid,
  p_metric_key text,
  p_value text
) returns void
language plpgsql
security definer
as $$
begin
  insert into public.ufa_metrics (tenant_id, metric_key, value, updated_at)
  values (p_tenant_id, p_metric_key, p_value, now())
  on conflict (tenant_id, metric_key)
  do update set value = excluded.value, updated_at = now(), usage_count = ufa_metrics.usage_count + 1;
end;
$$;

commit;

-- Verification queries
select 'Column types after migration:' as info;
select table_name, data_type
from information_schema.columns
where table_schema='public' and column_name='tenant_id'
order by table_name;

select 'UFA policies after migration:' as info;
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public' and tablename like 'ufa_%'
order by tablename, policyname;