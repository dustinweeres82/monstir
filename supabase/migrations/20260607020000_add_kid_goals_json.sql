-- Goals are now stored per kid profile (previously a single global list on the
-- parent's profile). Each kid's savings goals live in their own kids row.
alter table public.kids
  add column if not exists goals_json text;
