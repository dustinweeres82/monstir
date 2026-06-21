-- MON-92: atomic coin delta to kill the cross-device last-writer-wins lost-update
-- on kids.coins (the parent-facing "money owed" scalar). The client previously
-- wrote coins as an ABSOLUTE value from device-local state on every change, so two
-- devices approving chores near-simultaneously each computed from a stale balance
-- and the last write clobbered the other's credit (a kid underpaid a full chore;
-- reproduced live on a two-sim race). Award sites now pass a positive delta and
-- payout passes a negative delta, so concurrent approvals compose instead of
-- clobbering.
--
-- SECURITY INVOKER (the default) so the parent's existing RLS on `kids`
-- (parent owns their kids) still gates the update. Result is clamped at 0 so a
-- payout decrement can never drive the balance negative if local/DB diverge.
create or replace function public.increment_kid_coins(kid uuid, delta integer)
returns integer
language sql
as $$
  update public.kids
     set coins = greatest(0, coalesce(coins, 0) + delta)
   where id = kid
  returning coins;
$$;

grant execute on function public.increment_kid_coins(uuid, integer) to authenticated;
