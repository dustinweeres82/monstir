-- Schema-drift catch-up: chore_history_json and week_approval_days_json already
-- exist on public.profiles in production (added directly in the dashboard) and
-- are read/written by saveAppState, but no migration ever recorded them. Without
-- this, a database rebuilt from migrations alone (CI, a fresh staging project, a
-- local Supabase) would be missing the columns and silently fail those writes.
-- Idempotent: a no-op against the live DB, but brings version control in line.
alter table public.profiles
  add column if not exists chore_history_json text,
  add column if not exists week_approval_days_json text;

notify pgrst, 'reload schema';
