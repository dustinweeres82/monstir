-- MON-84: per-child weekly boss — server-authoritative identity + outcome.
--
-- Replaces the per-device AsyncStorage shared-HP model (one bar the whole family
-- wore down, with a participant ledger + finisher-captures-for-everyone). The new
-- model: the family faces ONE boss IDENTITY per week (shared, for the dashboard
-- reveal), but each kid fights their OWN single-resolution instance — capture or
-- got-away, their own rewards, no shared HP, no cross-kid race, no carry-forward.
-- The weekly reset is the parity mechanism: a new week_start = a fresh boss for
-- everyone, and last week's results simply age out as history.
--
-- Two tiny server-authoritative records, both keyed so they can't double-apply.
-- No realtime: the only shared fact is the weekly identity, which changes weekly
-- (not live). Everything else is each kid's own.

-- ── household_boss_week ──────────────────────────────────────────────────────
-- The shared boss IDENTITY for a household for a given week. One row per
-- (parent, week). `tier` is snapshotted at pick time so a mid-week kid evolution
-- (which raises the household's max monster tier) can't swap the boss out from
-- under everyone. week_start is the Monday key, same text format as
-- profiles.last_week_reset / getWeekMondayKey on the client.
create table if not exists public.household_boss_week (
  parent_id  uuid not null references public.profiles(id) on delete cascade,
  week_start text not null,
  boss_name  text not null,
  tier       integer not null,
  picked_at  timestamptz not null default now(),
  primary key (parent_id, week_start)
);

alter table public.household_boss_week enable row level security;

drop policy if exists "owner manages own household boss" on public.household_boss_week;
create policy "owner manages own household boss"
  on public.household_boss_week for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- ── kid_boss_result ──────────────────────────────────────────────────────────
-- Each kid's single-resolution outcome for the week. The primary key
-- (parent_id, kid_id, week_start) IS the dedup key: exactly one outcome per kid
-- per week. Keyed by kid_id, NOT name — kid names are not unique in this app.
-- Rows are kept after the week rolls (capture history / relic shelf provenance).
create table if not exists public.kid_boss_result (
  parent_id      uuid not null references public.profiles(id) on delete cascade,
  kid_id         uuid not null references public.kids(id) on delete cascade,
  week_start     text not null,
  boss_name      text not null,
  result         text not null check (result in ('captured', 'got-away')),
  completion_pct numeric not null default 0,
  coins_awarded  integer not null default 0,
  resolved_at    timestamptz not null default now(),
  primary key (parent_id, kid_id, week_start)
);

create index if not exists kid_boss_result_week_idx
  on public.kid_boss_result (parent_id, week_start);

alter table public.kid_boss_result enable row level security;

drop policy if exists "owner manages own kid boss results" on public.kid_boss_result;
create policy "owner manages own kid boss results"
  on public.kid_boss_result for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- ── get_or_create_household_boss ─────────────────────────────────────────────
-- Pins the week's shared identity. The first device to call (for a given week)
-- wins the pick; every other device + the parent dashboard read back the SAME
-- name. The client computes the candidate via its deterministic getWeeklyBoss(),
-- but the stored value is authoritative, so two devices on slightly different
-- tier/day state still agree. SECURITY INVOKER → the parent's RLS gates it.
create or replace function public.get_or_create_household_boss(
  p_week_start text,
  p_boss_name  text,
  p_tier       integer
) returns jsonb
language plpgsql
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text;
  v_tier integer;
begin
  if v_uid is null then
    return null;
  end if;

  insert into public.household_boss_week (parent_id, week_start, boss_name, tier)
  values (v_uid, p_week_start, p_boss_name, p_tier)
  on conflict (parent_id, week_start) do nothing;

  select boss_name, tier into v_name, v_tier
    from public.household_boss_week
   where parent_id = v_uid and week_start = p_week_start;

  return jsonb_build_object('boss_name', v_name, 'tier', v_tier);
end;
$$;

grant execute on function public.get_or_create_household_boss(text, text, integer) to authenticated;

-- ── resolve_kid_boss ─────────────────────────────────────────────────────────
-- Records a kid's single-resolution outcome exactly ONCE, and credits the
-- capture coin bonus ONLY on that first insert. A second call for the same
-- (kid, week) — other device, retry, double-tap — is a no-op. Mirrors
-- record_chore_approval: this is what makes the capture payout single-grant
-- server-side instead of client-side off a ledger (the MON-92 double-pay class).
-- Returns { first, coins_awarded }; the client fires the chest/relic/trophy UI
-- only when first = true. SECURITY INVOKER → parent RLS gates every write.
create or replace function public.resolve_kid_boss(
  p_kid_id         uuid,
  p_week_start     text,
  p_boss_name      text,
  p_result         text,
  p_completion_pct numeric,
  p_coins          integer
) returns jsonb
language plpgsql
as $$
declare
  v_parent uuid;
  v_rows   integer;
  v_coins  integer := 0;
begin
  select parent_id into v_parent from public.kids where id = p_kid_id;
  if v_parent is null then
    return jsonb_build_object('first', false, 'coins_awarded', 0);
  end if;

  insert into public.kid_boss_result
    (parent_id, kid_id, week_start, boss_name, result, completion_pct, coins_awarded)
  values
    (v_parent, p_kid_id, p_week_start, p_boss_name, p_result,
     coalesce(p_completion_pct, 0),
     case when p_result = 'captured' then greatest(0, coalesce(p_coins, 0)) else 0 end)
  on conflict (parent_id, kid_id, week_start) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    if p_result = 'captured' and coalesce(p_coins, 0) > 0 then
      update public.kids
         set coins = greatest(0, coalesce(coins, 0) + p_coins)
       where id = p_kid_id;
      v_coins := p_coins;
    end if;
    return jsonb_build_object('first', true, 'coins_awarded', v_coins);
  end if;
  return jsonb_build_object('first', false, 'coins_awarded', 0);
end;
$$;

grant execute on function public.resolve_kid_boss(uuid, text, text, text, numeric, integer) to authenticated;
