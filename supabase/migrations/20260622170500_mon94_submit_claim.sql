-- MON-94 (Phase 1 of MON-92): submit-path hardening.
-- Make chore_completions the atomic, guarded write on SUBMIT too — the mirror of
-- approve_chore_unit on approval. Closes the shared-chore leak proven live 2026-06-22:
-- a shared "first to finish" chore could DROP a row (2nd kid, sequential — guard
-- returns null, no row for that kid) or DOUBLE (simultaneous — non-atomic
-- read-then-insert lets both through). The old guard scoped shared to parent_id but
-- was a bare read-then-insert with no lock/constraint.
--
-- Strategy: an atomic-claim RPC + two partial UNIQUE indexes (the DB backstop).
-- The indexes are FORWARD-ONLY (created_at >= cutoff) so they apply over the existing
-- legacy duplicates (Henry 6/17, Millie 6/16 — gated dup+drop PAIRS that must be
-- repaired together, never the dup alone; see MON-94) WITHOUT blocking on that backfill.

-- ── Denormalized columns the partial index predicate + claim need on the row ───────
-- completion_mode: so the partial index can split shared vs individual without a join.
-- completed_date:  the client's LOCAL calendar day, stamped by the RPC. Local (not
--   UTC) day preserves the device-local "once per day" boundary the client guard has
--   always used; a UTC date mis-buckets evening submissions across midnight.
-- The submit_chore_claim RPC is the ONLY writer of these (and the only inserter of
-- chore_completions from the app). The gated backfill, when it runs, MUST also stamp
-- completed_date + completion_mode or its rows fall outside the unique index.
alter table public.chore_completions
  add column if not exists completion_mode text,
  add column if not exists completed_date  date;

-- ── Forward-only partial unique indexes (the atomic backstop, new rows only) ───────
-- Shared chores: one per (chore, household, day). Individual: one per (chore, kid, day).
-- 'rejected' rows fall out of the predicate so a re-do can reclaim the slot.
create unique index if not exists uniq_completion_shared_fwd
  on public.chore_completions (chore_id, parent_id, completed_date)
  where completion_mode = 'shared'
    and status in ('pending','approved')
    and created_at >= timestamptz '2026-06-22 17:05:00+00';

create unique index if not exists uniq_completion_individual_fwd
  on public.chore_completions (chore_id, kid_id, completed_date)
  where completion_mode is distinct from 'shared'
    and status in ('pending','approved')
    and created_at >= timestamptz '2026-06-22 17:05:00+00';

-- ── Atomic-claim submit ───────────────────────────────────────────────────────────
-- Returns (claimed_id, blocked_by_kid, blocked_by_name):
--   claimed                 → (new id, null, null)
--   blocked (slot taken)    → (null, holder_kid_id, holder_name)
--   genuine fail / capped   → (null, null, null)
-- The blocker is returned as a kid_id so the CLIENT can distinguish:
--   blocked_by_kid = the submitting kid  → SELF re-tap (their unsynced claim); settle
--     the tile to done QUIETLY, it is already theirs — do NOT show a "beat you" message.
--   blocked_by_kid = a sibling           → show the sibling-credited "{name} beat you
--     to it!" beat + settle done. (Only shared chores can be sibling-blocked; an
--     individual chore is always self-blocked since its scope is kid_id.)
-- Two layers, mirroring the SUBMIT guards in db.ts but made race-safe:
--   (1) read-check on the instant day-window (p_day_start) — works against BOTH new
--       rows and legacy rows (which predate completed_date), so it is the new-vs-legacy
--       backstop + weekly-cap check; AND
--   (2) the unique index — two concurrent NEW submits race here; the loser catches
--       unique_violation and returns the holder instead of minting a second row.
-- SECURITY INVOKER (default) like approve_chore_unit: RLS applies, parent_id = auth.uid().
drop function if exists public.submit_chore_claim(uuid, uuid, date, timestamptz, boolean, integer);
create function public.submit_chore_claim(
  p_chore_id          uuid,
  p_kid_id            uuid,
  p_local_date        date,
  p_day_start         timestamptz,
  p_requires_approval boolean,
  p_earned_cents      integer default null
) returns table (claimed_id uuid, blocked_by_kid uuid, blocked_by_name text)
language plpgsql
as $function$
declare
  v_parent      uuid;
  v_mode        text;
  v_freq        text;
  v_shared      boolean;
  v_target      int;
  v_week        date;
  v_count       int;
  v_blocker_kid uuid;
  v_id          uuid;
begin
  select parent_id into v_parent from public.kids where id = p_kid_id;
  if v_parent is null then
    return query select null::uuid, null::uuid, null::text; return;
  end if;

  -- Chore must exist in the table. Blob-only chores (no chores row) cannot be claimed;
  -- the client must upgrade the id (ensureChoreInDb) before calling — a (null,null,null)
  -- here is a genuine failure the caller reconciles, not a sibling-loss.
  select completion_mode, frequency into v_mode, v_freq
    from public.chores where id = p_chore_id;
  if not found then
    return query select null::uuid, null::uuid, null::text; return;
  end if;

  v_shared := (v_mode = 'shared');
  v_week   := p_local_date - ((extract(isodow from p_local_date)::int - 1));

  -- weekly target (mirror weeklyTarget() in db.ts)
  v_target := case
    when v_freq ilike '%every day%' or v_freq ilike 'daily%'           then 7
    when v_freq ilike '%3 times%'   or v_freq ilike '3x%'              then 3
    when v_freq ilike '%2 times%'   or v_freq ilike '2x%' or v_freq ilike 'twice%' then 2
    else 1 end;

  -- (1a) once-per-day, scoped shared=household / individual=kid, on the instant window.
  -- Capture the holder (kid_id) so the caller can branch self vs sibling.
  select cc.kid_id into v_blocker_kid
    from public.chore_completions cc
   where cc.chore_id = p_chore_id
     and (case when v_shared then cc.parent_id else cc.kid_id end)
         = (case when v_shared then v_parent else p_kid_id end)
     and cc.completed_at >= p_day_start
     and cc.completed_at <  p_day_start + interval '1 day'
     and cc.status in ('pending','approved')
   order by cc.completed_at
   limit 1;
  if v_blocker_kid is not null then
    return query select null::uuid, v_blocker_kid, (select name from public.kids where id = v_blocker_kid);
    return;
  end if;

  -- (1b) weekly cap
  select count(*) into v_count
    from public.chore_completions cc
   where cc.chore_id = p_chore_id
     and (case when v_shared then cc.parent_id else cc.kid_id end)
         = (case when v_shared then v_parent else p_kid_id end)
     and cc.week_start = v_week
     and cc.status in ('pending','approved');
  if v_count >= v_target then
    return query select null::uuid, null::uuid, null::text; return;
  end if;

  -- (2) atomic insert; the unique index is the concurrent-new backstop.
  begin
    insert into public.chore_completions
      (chore_id, kid_id, parent_id, status, week_start, completed_at, completed_date,
       completion_mode, approved_at, earned_cents)
    values
      (p_chore_id, p_kid_id, v_parent,
       case when p_requires_approval then 'pending' else 'approved' end,
       v_week, now(), p_local_date, v_mode,
       case when p_requires_approval then null else now() end,
       case when p_requires_approval then null else p_earned_cents end)
    returning id into v_id;
  exception when unique_violation then
    -- another submit claimed (chore, scope, day) between our read-check and insert
    select cc.kid_id into v_blocker_kid
      from public.chore_completions cc
     where cc.chore_id = p_chore_id
       and (case when v_shared then cc.parent_id else cc.kid_id end)
           = (case when v_shared then v_parent else p_kid_id end)
       and cc.completed_date = p_local_date
       and cc.status in ('pending','approved')
     limit 1;
    return query select null::uuid, v_blocker_kid, (select name from public.kids where id = v_blocker_kid);
    return;
  end;

  return query select v_id, null::uuid, null::text;
end;
$function$;
