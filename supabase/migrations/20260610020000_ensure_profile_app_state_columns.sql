-- The 20260610000000 migration was recorded in the history table but its DDL
-- never executed on remote (the columns were missing in production), so re-add
-- them idempotently here and force PostgREST to reload its schema cache.
alter table public.profiles
  add column if not exists chores_state_json text,
  add column if not exists kid_approval_settings_json text,
  add column if not exists last_week_reset text;

notify pgrst, 'reload schema';
