-- Store the chore completion % at battle time so a boss trophy's "Completion"
-- stat survives hydration from Supabase (reinstall / new device).
alter table public.boss_captures
  add column if not exists completion_pct integer;
