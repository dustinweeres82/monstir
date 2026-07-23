-- MON-85 Phase 2: kid-device pairing — BACKFILL into version control.
--
-- These objects were created directly on the remote project and were missing
-- from supabase/migrations. Reconstructed faithfully from the live schema and
-- written idempotently (IF NOT EXISTS / OR REPLACE) so applying against the
-- existing project is a no-op, and a fresh replay reproduces prod.
--
-- Model: each kid owns one STANDING 8-digit code (kids.pairing_code). A kid
-- types it on their own device; the redeem-pairing-code edge function (service
-- role) mints a magic-link token for the PARENT and the device assumes the
-- parent session. Codes are reusable; failed redeems are IP-throttled via
-- pairing_attempts. See supabase/functions/redeem-pairing-code.

-- Unique 8-digit code generator (collision-checked against existing kids).
create or replace function public.gen_kid_pairing_code()
  returns text
  language plpgsql
  set search_path to ''
as $$
declare c text;
begin
  loop
    c := lpad(((floor(random() * 90000000) + 10000000)::bigint)::text, 8, '0');
    exit when not exists (select 1 from public.kids where pairing_code = c);
  end loop;
  return c;
end;
$$;

-- Standing per-kid pairing code column.
alter table public.kids
  add column if not exists pairing_code text not null default public.gen_kid_pairing_code();

-- Parent-owner rotation of a kid's code (e.g. after a leak). SECURITY DEFINER
-- so it can update the row, but self-gated to the caller's own kid.
create or replace function public.rotate_kid_pairing_code(kid uuid)
  returns text
  language plpgsql
  security definer
  set search_path to 'public'
as $$
declare new_code text;
begin
  if not exists (select 1 from public.kids where id = kid and parent_id = auth.uid()) then
    raise exception 'not_authorized';
  end if;
  new_code := public.gen_kid_pairing_code();
  update public.kids set pairing_code = new_code where id = kid;
  return new_code;
end;
$$;

-- Only the parent-owner path (and service role) should ever call this; the
-- SELF check above already blocks misuse, but keep the API surface tight.
revoke execute on function public.rotate_kid_pairing_code(uuid) from anon, authenticated;

-- IP-keyed throttle ledger for the redeem endpoint (one row per failed attempt).
create table if not exists public.pairing_attempts (
  id         uuid primary key default gen_random_uuid(),
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists pairing_attempts_ip_created_idx
  on public.pairing_attempts (ip, created_at desc);

-- RLS on with NO policies: locks the table to the service-role edge function
-- only (normal roles get zero access), which is the intended posture.
alter table public.pairing_attempts enable row level security;
