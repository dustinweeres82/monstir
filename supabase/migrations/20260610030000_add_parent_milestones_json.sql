-- Parent-audience milestones were stored only in AsyncStorage and lost on
-- reinstall / new device. Persist them on the profile so they survive, mirroring
-- the other profile-level *_json state columns.
alter table public.profiles
  add column if not exists parent_milestones_json text;

notify pgrst, 'reload schema';
