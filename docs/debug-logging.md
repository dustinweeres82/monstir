# Debug logging — reading the `debug_logs` table

Episodic debug logging for the alpha. A local 500-event ring buffer records
everything that happens; it uploads to `public.debug_logs` as **one row per
flush**, never continuously. See [`src/lib/debugLog.ts`](../src/lib/debugLog.ts).

You read these rows from the **Supabase dashboard** (SQL Editor or Table
Editor). Clients can write but never read the table back — RLS has an
INSERT-only policy and no SELECT policy, so the dashboard (service role) is the
only reader.

## When a row gets written (flush triggers)

The `error_message` column doubles as the **reason the row exists** — it's your
first filter:

| `error_message` | trigger |
| --- | --- |
| `manual.settings` | parent press-and-held the version label in Settings |
| `session.background` | app went to the background |
| `uncaught: <msg>` | uncaught JS error (global handler) |
| `render: <frame>` | render-time crash caught by the ErrorBoundary |
| `auth.signout` | sign-out (ships the session buffer before clearing identity) |

Manual and session flushes bypass the 60s dedupe so they always land; error
flushes dedupe as a crash-loop guard.

## Row shape

| column | what's in it |
| --- | --- |
| `created_at` | flush time |
| `family_id` | the signed-in parent's auth `user.id` |
| `platform` | `ios` / `android` |
| `app_version` | from `expo-constants` |
| `error_message` | the flush reason (see table above) |
| `logs` | the dumped ring buffer — newline-delimited JSON, oldest first |
| `context` | whatever `getContext()` returned at flush time |

Each line in `logs` is `{ t, level, event, data }`. Events follow a
`domain.action` naming convention (`chore.submit`, `db.payout.save`,
`auth.social.fail`, `battle.end`, …) so every diagnostic question becomes a
one-line `event = '...'` filter.

**Payloads are IDs and counts only — never kid names or PII.** Kid references
are the DB UUID (`getKidDbId`); boss names are fixed game content. This keeps
the COPPA line intact: the dump is safe to read in a support row.

### Example trail (a silent chore-submit failure)

```jsonl
{"t":"2026-06-16T21:04:09.233Z","level":"info","event":"chore.submit","data":{"choreId":"c_91f2","kidId":"k_4a7e","difficulty":"medium","earnedCents":50,"requireApproval":true}}
{"t":"2026-06-16T21:04:09.512Z","level":"warn","event":"db.chore.submit","data":{"message":"TypeError: Network request failed"}}
```

The kid's UI showed the chore done (`chore.submit`), but the very next line
shows the Supabase write threw and was swallowed (`db.chore.submit` at `warn`) —
the silent failure made visible.

## Queries

Run these in the Supabase **SQL Editor**. You can save each as a named query so
triage is one click.

### 1. Recent rows (triage starting point)

```sql
select created_at, platform, app_version, error_message, family_id,
       length(logs) - length(replace(logs, E'\n', '')) + 1 as event_count
from debug_logs
order by created_at desc
limit 50;
```

### 2. Expand one row into a readable timeline

Paste a row's `id`. The bottom rows are what happened right before the flush.

```sql
select
  line->>'t'     as t,
  line->>'level' as level,
  line->>'event' as event,
  line->'data'   as data
from debug_logs d
cross join lateral (
  select nullif(trim(l), '')::jsonb as line
  from regexp_split_to_table(d.logs, E'\n') as l
) parsed
where d.id = '<paste-row-id>'
  and line is not null
order by t;
```

### 3. Crashes only (skip routine manual/background dumps)

```sql
select created_at, family_id, error_message
from debug_logs
where error_message like 'uncaught:%'
   or error_message like 'render:%'
order by created_at desc;
```

### 4. One family's history

```sql
select created_at, error_message, logs
from debug_logs
where family_id = '<parent-user-id>'
order by created_at desc
limit 20;
```

### 5. Every row where a specific event fired

Swap the event name for any instrumented event (`db.payout.save`,
`auth.social.fail`, `battle.end`, …).

```sql
select d.created_at, d.error_message, line->'data' as data
from debug_logs d
cross join lateral (
  select nullif(trim(l), '')::jsonb as line
  from regexp_split_to_table(d.logs, E'\n') as l
) parsed
where line is not null
  and line->>'event' = 'db.chore.submit'
order by d.created_at desc;
```

## Triggering a manual dump (what you tell an alpha parent)

When a parent says *"it didn't work"* but nothing crashed: have them **reproduce
the broken thing, then go to parent Settings → bottom → press and hold the
version label** (`v1.0.0`) for ~0.7s until the "Logs sent ✓" toast. That ships
the last 500 events with `error_message = 'manual.settings'`. It's parent-side
behind the PIN, and a long-press is the inverse of the rapid-tap battle input,
so kids never trigger it.

## Known alpha gap

An **offline** crash records to the buffer but the upload silently fails and
that snapshot is lost — there's no offline persist-and-retry by design. The
manual gesture once back on wifi is the fallback.

## Adding more breadcrumbs

```ts
import { log, logError, logDbError } from './src/lib/debugLog';

log('domain.action', { someId, count });          // IDs/counts only, no names
logDbError('db.thing.save', e);                    // in a write's .catch()
try { ... } catch (e) { captureError(e, 'where'); } // records AND flushes now
```

Use `getKidDbId(name)` (the UUID), never the kid's name.
