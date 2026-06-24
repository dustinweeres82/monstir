-- Instant cross-device sync for everything that wasn't already live.
--
-- Today only `chore_completions` and `savings_goals` are in the realtime
-- publication, so a chore completed on a kid's iPad shows up on the parent's
-- phone instantly — but a PAYOUT, a battle win, a new collectible/milestone, a
-- monster evolution, or a chore/rate/kid edit only appeared after an app
-- relaunch. This adds the rest of the shared household tables to the publication
-- so the app can subscribe and trigger the same debounced reload it already uses
-- for chore approvals. Every table is RLS-scoped to `parent_id = auth.uid()`
-- (profiles to `id = auth.uid()`), so realtime events stay within a household.
--
-- Idempotent: each table is only added if it isn't already published.
do $$
declare
  t text;
begin
  foreach t in array array[
    'payouts',              -- parent pays out a kid (Tier 1: money)
    'kids',                 -- coins / xp / monster / shards / streak + add/rename/remove kid
    'chores',               -- add / edit / delete a chore (Tier 3: parent config)
    'profiles',             -- pay rate, approval settings, PIN, notif prefs, board blob
    'milestones',           -- a kid earns a milestone (Tier 2: progress)
    'collectibles',         -- a kid earns a collectible
    'boss_captures',        -- a kid captures the weekly boss
    'kid_boss_result',      -- per-child boss resolution (win/loss + bonus coins)
    'household_boss_week'   -- the shared weekly boss identity rotates
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- DELETE realtime events only carry the primary key under the default replica
-- identity, so a row-level filter like `parent_id=eq.X` can never match a delete
-- and the event is dropped. FULL replica identity ships the whole old row, so
-- deletes match the filter and propagate. Only the two tables a parent can
-- actually delete from need this: deleting a chore and removing a kid. The other
-- tables are append-only / upsert-only, so their INSERT/UPDATE events (which
-- always carry the full new row) already match the filter under default replica
-- identity. (savings_goals was given FULL in its own migration.)
alter table public.chores replica identity full;
alter table public.kids   replica identity full;
