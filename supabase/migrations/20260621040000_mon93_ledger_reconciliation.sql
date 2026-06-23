-- MON-93 (lands in the MON-94 PR): reconciliation guardrail.
--
-- Read-only view that asserts the three money copies agree per kid:
--   • coins                 — the kids.coins balance the parent sees
--   • history_table_cents   — sum of the chore_history audit feed
--   • completions_appr_cents— sum of APPROVED chore_completions (the authority)
--   • paid_cents            — payouts already made
-- Audit-derived truth: a kid is owed (approved completions − payouts), and coins
-- should equal that, and the history feed should equal approved completions.
--
-- This is the INSTRUMENT, not the alarm. Per MON-94 it ships now but is only
-- "turned on" (queried for alerts: `where coins_drift or history_vs_completions_drift`)
-- AFTER the Step 3 backfill — before that it correctly flags the known gaps
-- (e.g. Millie −$1.50) and would false-positive.

create or replace view public.ledger_reconciliation as
select
  k.parent_id,
  k.id   as kid_id,
  k.name as kid_name,
  k.coins                                                       as coins,
  coalesce(h.cents, 0)                                          as history_table_cents,
  coalesce(c.cents, 0)                                          as completions_appr_cents,
  coalesce(p.cents, 0)                                          as paid_cents,
  (coalesce(c.cents, 0) - coalesce(p.cents, 0))                 as audit_owed_cents,
  (k.coins <> coalesce(c.cents, 0) - coalesce(p.cents, 0))      as coins_drift,
  (coalesce(h.cents, 0) <> coalesce(c.cents, 0))                as history_vs_completions_drift
from public.kids k
left join (select kid_id, sum(earned_cents) cents from public.chore_history group by kid_id)                          h on h.kid_id = k.id
left join (select kid_id, sum(earned_cents) cents from public.chore_completions where status = 'approved' group by kid_id) c on c.kid_id = k.id
left join (select kid_id, sum(amount_cents) cents from public.payouts group by kid_id)                                p on p.kid_id = k.id;
