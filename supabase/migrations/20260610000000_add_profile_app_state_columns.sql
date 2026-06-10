alter table public.profiles
  add column if not exists chores_state_json text,
  add column if not exists kid_approval_settings_json text,
  add column if not exists last_week_reset text;
