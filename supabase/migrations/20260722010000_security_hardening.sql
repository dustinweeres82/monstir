-- Security hardening (2026-07-22 audit remediation). Idempotent.
--
-- 1. ledger_reconciliation was a definer view (security_invoker off) with no
--    parent_id filter and SELECT granted to anon/authenticated, so any client
--    could read every household's kid balances. Re-scope to the querying user's
--    RLS and restrict to the service-role (admin dashboard) path only.
-- 2. debug_logs INSERT policy was WITH CHECK (true) — any authenticated user
--    could insert rows spoofing another family_id. Bind to the caller.
-- 3. Definer functions callable by anon/authenticated: not exploitable (they
--    self-gate on auth.uid()), but revoke to clear the linter + shrink surface.
-- 4. Pin search_path on the money/game RPCs (all SECURITY INVOKER, all bodies
--    fully schema-qualified, so '' is safe and non-breaking).

-- 1. Ledger reconciliation view — stop the cross-household leak.
alter view public.ledger_reconciliation set (security_invoker = on);
revoke all on public.ledger_reconciliation from anon, authenticated;
grant select on public.ledger_reconciliation to service_role;

-- 2. debug_logs — block family_id spoofing (allow null so pre-context crash
--    logs from a signed-in user still land; null cannot impersonate a family).
drop policy if exists "authenticated can insert debug logs" on public.debug_logs;
create policy "authenticated can insert own debug logs"
  on public.debug_logs for insert to authenticated
  with check (family_id = auth.uid() or family_id is null);

-- 3. Revoke public/anon/authenticated EXECUTE on self-gating definer functions.
revoke execute on function public.rotate_kid_pairing_code(uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 4. Pin search_path on the invoker RPCs (no body changes; refs are qualified).
alter function public.increment_kid_coins(uuid, integer) set search_path = '';
alter function public.record_chore_approval(uuid, uuid, text, text, text, integer) set search_path = '';
alter function public.approve_chore_unit(uuid, uuid, text, text, text, integer) set search_path = '';
alter function public.submit_chore_claim(uuid, uuid, date, timestamptz, boolean, integer) set search_path = '';
alter function public.resolve_kid_boss(uuid, text, text, text, numeric, integer) set search_path = '';
alter function public.get_or_create_household_boss(text, text, integer) set search_path = '';
