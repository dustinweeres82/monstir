-- Boss-battle capture bonus is opt-in: default the toggle OFF for new accounts.
-- The columns may already exist (added out-of-band), so add them idempotently
-- and also reset the default on the existing column. Existing rows are left as-is
-- to preserve any explicit choice already made.
alter table public.profiles
  add column if not exists battle_coin_bonus_enabled boolean default false,
  add column if not exists battle_coin_bonus_multiplier numeric default 0.25;

-- battle_coin_bonus_multiplier is now a fraction of the base chore rate paid on
-- a boss win (0.25 = 25%), not a multiple of the boss's capture value.
alter table public.profiles
  alter column battle_coin_bonus_enabled set default false,
  alter column battle_coin_bonus_multiplier set default 0.25;

notify pgrst, 'reload schema';
