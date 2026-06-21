-- MON-92 follow-up: kill the cross-device DOUBLE-COUNT on chore approvals.
--
-- Background: `chore_completions` (the audit table) is server-guarded and stays
-- clean, but the two DERIVED writes — the `chore_history` feed row and the
-- `kids.coins` credit — were fired per client approval ACTION, ungated by the
-- authoritative pending→approved transition. When the same approval ran on two
-- devices (or a double-tap / realtime echo), each device wrote its own history
-- row AND incremented coins. The MON-92 atomic delta made the coin increments
-- COMPOSE, so the balance doubled instead of clobbering. Reproduced live on the
-- Chris/Sam test family: coins = sum of duplicated history, double the audit.
--
-- Fix: anchor both derived writes to the completion row. `chore_history` gets a
-- `completion_id`; coins are credited only when the history row is FIRST inserted.
-- Re-running for the same completion (second device, retry, echo) is a no-op.

alter table public.chore_history
  add column if not exists completion_id uuid
  references public.chore_completions(id) on delete cascade;

-- Plain unique index: Postgres treats NULLs as distinct, so the pre-existing
-- history rows (completion_id IS NULL) are unaffected; only linked rows dedup.
create unique index if not exists chore_history_completion_id_key
  on public.chore_history(completion_id);

-- Idempotent award. Inserts the history row keyed to its completion exactly once,
-- and credits coins ONLY on the first insert. Returns the cents actually awarded
-- (0 if this completion was already recorded). SECURITY INVOKER so the parent's
-- existing RLS on chore_history / kids still gates every write.
create or replace function public.record_chore_approval(
  p_completion_id uuid,
  p_kid_id        uuid,
  p_kid_name      text,
  p_chore_name    text,
  p_icon          text,
  p_earned_cents  integer
) returns integer
language plpgsql
as $$
declare
  v_rows   integer;
  v_parent uuid;
begin
  select parent_id into v_parent from public.kids where id = p_kid_id;
  if v_parent is null then return 0; end if;

  insert into public.chore_history
    (parent_id, kid_id, kid_name, chore_name, icon, earned_cents, approved_at, completion_id)
  values
    (v_parent, p_kid_id, p_kid_name, p_chore_name, p_icon, p_earned_cents, now(), p_completion_id)
  on conflict (completion_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.kids
       set coins = greatest(0, coalesce(coins, 0) + p_earned_cents)
     where id = p_kid_id;
    return p_earned_cents;
  end if;
  return 0;
end;
$$;

grant execute on function public.record_chore_approval(uuid, uuid, text, text, text, integer) to authenticated;
