-- MON-29: enable Supabase Realtime on chore_completions so a parent's approval
-- board updates live when a kid submits a chore on another device (and across
-- the household generally). RLS already scopes delivery — the "owner read"
-- policy (auth.uid() = parent_id) means a subscriber only receives their own
-- household's rows, and both parent and paired-kid devices authenticate as the
-- parent. Idempotent: skip if the table is already in the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chore_completions'
  ) then
    alter publication supabase_realtime add table public.chore_completions;
  end if;
end $$;
