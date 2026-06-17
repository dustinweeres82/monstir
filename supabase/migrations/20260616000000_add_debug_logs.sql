-- debug_logs: episodic crash/error snapshots shipped from the app.
-- One row per flush. You read these from the Supabase dashboard (service
-- role bypasses RLS); regular clients can write but never read them back.

create table if not exists public.debug_logs (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  family_id     uuid,            -- add a FK to your families/parent table if you want it
  platform      text,            -- 'ios' | 'android'
  app_version   text,
  error_message text,            -- doubles as the flush reason ('manual', 'uncaught: ...')
  logs          text,            -- the dumped ring buffer (line-delimited JSON)
  context       jsonb            -- whatever getContext() returned at flush time
);

create index if not exists debug_logs_created_at_idx on public.debug_logs (created_at desc);
create index if not exists debug_logs_family_idx     on public.debug_logs (family_id);

alter table public.debug_logs enable row level security;

-- Clients may write logs only. No select policy exists, so authenticated and
-- anon users cannot read the table. You read it from the dashboard.
create policy "authenticated can insert debug logs"
  on public.debug_logs
  for insert
  to authenticated
  with check (true);
