-- Adds the per-chore completion model for "Everyone" chores.
--   'shared'      → one household task; first kid to finish earns it
--   'independent' → each kid has their own copy and own weekly count
-- NULL is treated as 'shared' by the app for backwards compatibility.
alter table public.chores
  add column if not exists completion_mode text
  check (completion_mode in ('shared', 'independent'));
