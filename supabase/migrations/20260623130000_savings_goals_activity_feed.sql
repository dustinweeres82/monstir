-- Wire up the previously-orphaned savings_goals table as the normalized store
-- for per-kid savings goals (they lived in the kids.goals_json blob). The table
-- already had name/target_cents/saved_cents/category/color/icon; add activity_feed
-- so the per-goal progress feed (recent contributions) survives the move. The
-- constant `milestones` labels are re-defaulted on load, and the rendered icon is
-- derived from the stored iconKey (`icon` column), so no other columns are needed.
alter table public.savings_goals
  add column if not exists activity_feed jsonb not null default '[]'::jsonb;

-- Realtime so a parent editing a goal on their phone syncs live to the kid's
-- paired device (mirrors the chore_completions realtime channel). Idempotent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'savings_goals'
  ) then
    alter publication supabase_realtime add table public.savings_goals;
  end if;
end $$;

-- DELETE realtime events only carry the primary key under the default replica
-- identity, so a row-level filter like `parent_id=eq.X` can never match a delete
-- and the event is dropped (the kid device would keep a phantom deleted goal).
-- FULL replica identity ships the whole old row, so deletes match the filter and
-- propagate. (INSERTs already carry the full new row, so they were unaffected.)
alter table public.savings_goals replica identity full;
