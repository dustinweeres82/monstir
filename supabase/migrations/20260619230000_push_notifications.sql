-- MON-29: Push notification system (alpha MVP).
--
-- Adds per-child push-token storage, a notification audit/dedup log, parent
-- notification prefs, and the server-side send pipeline: DB triggers on
-- chore_completions (chore submitted -> review; chore approved) plus an hourly
-- battle-day cron, all firing the `send-push` Edge Function via pg_net. The
-- actual send logic (recipient resolution, quiet hours, 2/day cap, dedup, Expo
-- transport) lives in the function; this migration is storage + plumbing only.
--
-- Secrets (the project URL + a shared webhook secret) live in Vault and are
-- created out-of-band, never in this file, so the migration is environment-
-- agnostic and secret-free.

-- ── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ── push_tokens ──────────────────────────────────────────────────────────────
-- One row per Expo push token. Every device authenticates as the parent (kid
-- devices assume the parent session via pairing), so tokens are keyed by
-- (parent_id, kid_id): kid_id set = that kid's device; null = the parent's own
-- device. expo_token is unique so a device re-registering re-keys cleanly.
create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references public.profiles(id) on delete cascade,
  kid_id      uuid references public.kids(id) on delete cascade,
  expo_token  text not null unique,
  platform    text,
  timezone    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_tokens_parent_idx on public.push_tokens (parent_id);
create index if not exists push_tokens_kid_idx    on public.push_tokens (kid_id);

alter table public.push_tokens enable row level security;

drop policy if exists "owner manages own push tokens" on public.push_tokens;
create policy "owner manages own push tokens"
  on public.push_tokens for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- ── notification_log ─────────────────────────────────────────────────────────
-- Every send lands here: 30-day history for debugging, the per-recipient 2/day
-- cap, and per-event idempotency. dedup_key is unique so the same event can't
-- double-send (e.g. a retried trigger or overlapping cron tick).
create table if not exists public.notification_log (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.profiles(id) on delete cascade,
  kid_id      uuid references public.kids(id) on delete cascade,
  expo_token  text,
  type        text not null,
  dedup_key   text unique,
  title       text,
  body        text,
  data        jsonb,
  sent_at     timestamptz not null default now()
);

create index if not exists notification_log_parent_idx on public.notification_log (parent_id, sent_at desc);
create index if not exists notification_log_token_idx  on public.notification_log (expo_token, sent_at desc);

alter table public.notification_log enable row level security;

drop policy if exists "owner reads own notification log" on public.notification_log;
create policy "owner reads own notification log"
  on public.notification_log for select to authenticated
  using (parent_id = auth.uid());

-- ── profiles.notification_prefs ──────────────────────────────────────────────
-- Backs the Settings -> Notifications toggles. Alpha wires `approvals` (parent
-- chore-review pings) and `battle` (Sunday battle-day); `payouts` is stored for
-- the deferred payout digest.
alter table public.profiles
  add column if not exists notification_prefs jsonb not null
  default '{"approvals": true, "battle": true, "payouts": true}'::jsonb;

-- ── Webhook-secret check ─────────────────────────────────────────────────────
-- send-push runs with verify_jwt=false and authenticates callers via a shared
-- secret. The function (service role) validates the incoming header against the
-- Vault secret through this SECURITY DEFINER helper, so it works regardless of
-- whether service_role has direct Vault grants.
create or replace function public.push_webhook_secret_matches(candidate text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'push_webhook_secret' and decrypted_secret = candidate
  );
$$;
revoke all on function public.push_webhook_secret_matches(text) from public, anon, authenticated;
grant execute on function public.push_webhook_secret_matches(text) to service_role;

-- ── Send-pipeline plumbing ───────────────────────────────────────────────────
-- Triggers/cron POST to the send-push Edge Function via pg_net, reading the
-- project URL + webhook secret from Vault. Fire-and-forget: a send failure must
-- never roll back the chore write that caused it.
create or replace function public._send_push_invoke(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  secret   text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret   from vault.decrypted_secrets where name = 'push_webhook_secret';
  if base_url is null or secret is null then
    raise warning '[send-push] missing vault secret(s); skipping notify';
    return;
  end if;
  perform net.http_post(
    url     := base_url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    body    := payload
  );
end;
$$;
-- Only triggers/cron (run as the owning role) may call these. Never expose them
-- to API roles: _send_push_invoke reads the Vault secret and POSTs arbitrary
-- payloads to the edge function.
revoke all on function public._send_push_invoke(jsonb) from public, anon, authenticated;

create or replace function public.notify_chore_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public._send_push_invoke(jsonb_build_object('type', 'chore_submitted', 'completion_id', new.id));
    end if;
  elsif tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status = 'approved' then
      perform public._send_push_invoke(jsonb_build_object('type', 'chore_approved', 'completion_id', new.id));
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_chore_event() from public, anon, authenticated;

drop trigger if exists chore_completion_notify_ins on public.chore_completions;
create trigger chore_completion_notify_ins
  after insert on public.chore_completions
  for each row execute function public.notify_chore_event();

drop trigger if exists chore_completion_notify_upd on public.chore_completions;
create trigger chore_completion_notify_upd
  after update of status on public.chore_completions
  for each row execute function public.notify_chore_event();

-- ── Battle-day cron ──────────────────────────────────────────────────────────
-- Runs hourly; the function sends only to households whose LOCAL time is
-- Sunday 08:00 and that haven't been pinged this week (timezone math + weekly
-- dedup live in the function, so one schedule covers every timezone).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'battle-day-sweep') then
    perform cron.unschedule('battle-day-sweep');
  end if;
end $$;

select cron.schedule('battle-day-sweep', '0 * * * *', $cron$
  select public._send_push_invoke('{"type":"battle_day_sweep"}'::jsonb);
$cron$);
