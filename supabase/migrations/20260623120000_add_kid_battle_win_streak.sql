-- Persist the per-kid consecutive-capture counter that drives the "Undefeated"
-- milestone (4 boss captures in a row, no escape between). It previously lived
-- only in React state and reset to 0 on every reload, making the milestone
-- unreachable across sessions. Absolute sync, same pattern as xp / weekly_xp /
-- shards (a kid is locked to one device, so no cross-device race).
alter table public.kids
  add column if not exists battle_win_streak integer not null default 0;
