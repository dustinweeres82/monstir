-- MON-94 (Phase 1 of MON-92): stop chore_completions dropping rows on approval.
--
-- The shipped approval path credited coins / chore_history / the blob OPTIMISTICALLY,
-- then fired a best-effort flip of a pending chore_completions row scoped to the
-- CURRENT week_start at a fixed unitIdx. In a fast multi-chore (Sunday-batch)
-- approval, some calls found no claimable pending row (backlog from another week,
-- a guard-skipped submit, or a sibling device already claimed it), returned early,
-- and credited nothing in the audit — while the blob had already moved. The audit
-- table ended up SHORT (live: Millie −$1.50 / 2 rows, from one 6/19 batch).
--
-- Fix = make chore_completions the PRIMARY, guarded write, with Option-2
-- (claim-or-revert) semantics: approval may only ever flip a row that came through
-- a real submission. If there is no pending row to flip, it awards NOTHING and the
-- caller rolls back its optimistic credit — the ledger never gains a row that
-- didn't originate from a submission, and a kid is never double-paid.

-- Claim + approve exactly ONE pending unit for (chore, kid), atomically.
-- Returns the cents awarded, or NULL when nothing was claimable (caller reverts).
create or replace function public.approve_chore_unit(
  p_chore_id     uuid,
  p_kid_id       uuid,
  p_kid_name     text,
  p_chore_name   text,
  p_icon         text,
  p_earned_cents integer
) returns integer
language plpgsql
as $$
declare
  v_id     uuid;
  v_parent uuid;
  v_rows   integer;
begin
  select parent_id into v_parent from public.kids where id = p_kid_id;
  if v_parent is null then return null; end if;

  -- Claim the oldest still-pending unit for this (chore, kid), ANY week (backlog
  -- included — the old current-week-only filter is what dropped backlog approvals).
  -- FOR UPDATE SKIP LOCKED so concurrent batch / multi-device approvals each grab
  -- a DISTINCT row instead of colliding, and a sibling that already took the last
  -- pending row finds nothing here (no double claim).
  update public.chore_completions
     set status = 'approved', approved_at = now(), earned_cents = p_earned_cents
   where id = (
     select id from public.chore_completions
      where chore_id = p_chore_id and kid_id = p_kid_id and status = 'pending'
      order by completed_at
      limit 1
      for update skip locked
   )
  returning id into v_id;

  -- Option 2 (claim-or-revert): nothing real to approve → award nothing, signal
  -- the caller (NULL) to roll back its optimistic coin/history credit.
  if v_id is null then
    return null;
  end if;

  -- Idempotent award keyed to the completion row: history exactly once, coins
  -- exactly once, no matter how many devices / retries / echoes fire for this same
  -- completion (mirrors record_chore_approval's contract).
  insert into public.chore_history
    (parent_id, kid_id, kid_name, chore_name, icon, earned_cents, approved_at, completion_id)
  values
    (v_parent, p_kid_id, p_kid_name, p_chore_name, p_icon, p_earned_cents, now(), v_id)
  on conflict (completion_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.kids set coins = greatest(0, coalesce(coins, 0) + p_earned_cents) where id = p_kid_id;
  end if;

  return p_earned_cents;
end;
$$;

grant execute on function public.approve_chore_unit(uuid, uuid, text, text, text, integer) to authenticated;
