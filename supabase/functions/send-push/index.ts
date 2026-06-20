// send-push — MON-29 push notification sender (alpha MVP).
//
// One Edge Function, three event types, all server-derived (derive-don't-track):
//   • chore_submitted   → ping the PARENT's device(s): a chore needs review
//   • chore_approved     → ping the specific KID's device(s): their work landed
//   • battle_day_sweep   → hourly cron; ping whole households at local Sun 08:00
//
// Callers are DB triggers / pg_cron via pg_net, authenticated with a shared
// webhook secret (verify_jwt is disabled). The function never trusts client
// input beyond the event id: it re-reads current ledger state, resolves the
// correct token set, and applies the guardrails (quiet hours 9pm–7am local,
// max 2/day per device, per-event dedup) before sending via Expo Push.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.107.0";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const QUIET_START = 21; // 9pm
const QUIET_END = 7; //    7am
const DAILY_CAP = 2; //    max notifications/day per device, across all types
const DEFAULT_TZ = "UTC";

interface Send {
  parent_id: string;
  kid_id: string | null;
  expo_token: string;
  timezone: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  dedup_key: string;
}

interface TokenRow {
  parent_id: string;
  kid_id: string | null;
  expo_token: string;
  timezone: string | null;
}

// ── Time helpers ─────────────────────────────────────────────────────────────
function zoned(tz: string, now = new Date()): { hour: number; weekday: number; ymd: string } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "numeric",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_TZ,
      weekday: "short",
      hour: "numeric",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    hour: parseInt(get("hour"), 10) % 24,
    weekday: wd[get("weekday")] ?? 0,
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function inQuietHours(tz: string): boolean {
  const { hour } = zoned(tz);
  return hour >= QUIET_START || hour < QUIET_END;
}

// ── Recipient + copy resolution per event type ───────────────────────────────
async function resolveSends(supabase: SupabaseClient, payload: Record<string, unknown>): Promise<Send[]> {
  const type = String(payload.type ?? "");

  if (type === "chore_submitted" || type === "chore_approved") {
    const completionId = String(payload.completion_id ?? "");
    if (!completionId) return [];

    const { data: c } = await supabase
      .from("chore_completions")
      .select("id, kid_id, parent_id, chore_id, status")
      .eq("id", completionId)
      .maybeSingle();
    if (!c) return [];

    const [{ data: chore }, { data: kid }, { data: parent }] = await Promise.all([
      supabase.from("chores").select("name").eq("id", c.chore_id).maybeSingle(),
      supabase.from("kids").select("name").eq("id", c.kid_id).maybeSingle(),
      supabase.from("profiles").select("name, notification_prefs").eq("id", c.parent_id).maybeSingle(),
    ]);
    const choreName = chore?.name ?? "a chore";
    const kidName = kid?.name ?? "Your kid";
    const parentName = parent?.name?.trim() || "Your grown-up";
    const prefs = (parent?.notification_prefs ?? {}) as Record<string, boolean>;

    if (type === "chore_submitted") {
      // Suppress if no longer pending (already approved/rejected on another device).
      if (c.status !== "pending") return [];
      if (prefs.approvals === false) return [];
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("parent_id, kid_id, expo_token, timezone")
        .eq("parent_id", c.parent_id)
        .is("kid_id", null);
      return (tokens ?? []).map((t: TokenRow) => ({
        parent_id: c.parent_id,
        kid_id: null,
        expo_token: t.expo_token,
        timezone: t.timezone ?? DEFAULT_TZ,
        type,
        title: "Chore ready to review",
        body: `${kidName} finished ${choreName} — tap to approve`,
        data: { screen: "parentApprovals", completion_id: completionId, kid_id: c.kid_id },
        dedup_key: `submitted:${completionId}:${t.expo_token}`,
      }));
    }

    // chore_approved → the specific kid's device(s).
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("parent_id, kid_id, expo_token, timezone")
      .eq("kid_id", c.kid_id);
    return (tokens ?? []).map((t: TokenRow) => ({
      parent_id: c.parent_id,
      kid_id: c.kid_id,
      expo_token: t.expo_token,
      timezone: t.timezone ?? DEFAULT_TZ,
      type,
      title: "Chore approved! 🎉",
      body: `${parentName} approved ${choreName}! 🎉`,
      data: { screen: "kidHome", completion_id: completionId },
      dedup_key: `approved:${completionId}:${t.expo_token}`,
    }));
  }

  if (type === "battle_day_sweep") {
    // Every token whose LOCAL time is Sunday 08:00. Weekly dedup is the local
    // Sunday date baked into dedup_key, so a device gets one battle ping/week.
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("parent_id, kid_id, expo_token, timezone");
    const due = (tokens ?? []).filter((t: TokenRow) => {
      const z = zoned(t.timezone ?? DEFAULT_TZ);
      return z.weekday === 0 && z.hour === 8;
    });
    if (due.length === 0) return [];

    // Battle pref is per household; fetch once for the due parents.
    const parentIds = [...new Set(due.map((t: TokenRow) => t.parent_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, notification_prefs")
      .in("id", parentIds);
    const battleOff = new Set(
      (profiles ?? [])
        .filter((p: { notification_prefs?: Record<string, boolean> }) => p.notification_prefs?.battle === false)
        .map((p: { id: string }) => p.id),
    );

    return due
      .filter((t: TokenRow) => !battleOff.has(t.parent_id))
      .map((t: TokenRow) => {
        const z = zoned(t.timezone ?? DEFAULT_TZ);
        const isKid = t.kid_id != null;
        return {
          parent_id: t.parent_id,
          kid_id: t.kid_id,
          expo_token: t.expo_token,
          timezone: t.timezone ?? DEFAULT_TZ,
          type,
          title: isKid ? "IT'S BATTLE DAY! ⚔️" : "Boss battle today! ⚔️",
          body: isKid
            ? "Open Monstir to fight your boss!"
            : "Boss battle is today — approve any pending chores.",
          data: { screen: isKid ? "battle" : "parentApprovals" },
          dedup_key: `battle:${z.ymd}:${t.expo_token}`,
        };
      });
  }

  return [];
}

// ── Guardrails: quiet hours, per-device daily cap, dedup ─────────────────────
async function applyGuardrails(supabase: SupabaseClient, candidates: Send[]): Promise<Send[]> {
  if (candidates.length === 0) return [];

  // Drop quiet-hours devices up front.
  const awake = candidates.filter((s) => !inQuietHours(s.timezone));
  if (awake.length === 0) return [];

  const tokens = [...new Set(awake.map((s) => s.expo_token))];
  const dedupKeys = awake.map((s) => s.dedup_key);

  // One query each for the day's counts and the already-sent dedup keys.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ data: recent }, { data: existing }] = await Promise.all([
    supabase.from("notification_log").select("expo_token").in("expo_token", tokens).gte("sent_at", since),
    supabase.from("notification_log").select("dedup_key").in("dedup_key", dedupKeys),
  ]);

  const counts = new Map<string, number>();
  for (const r of recent ?? []) counts.set(r.expo_token, (counts.get(r.expo_token) ?? 0) + 1);
  const alreadySent = new Set((existing ?? []).map((r: { dedup_key: string }) => r.dedup_key));

  const out: Send[] = [];
  for (const s of awake) {
    if (alreadySent.has(s.dedup_key)) continue;
    const used = counts.get(s.expo_token) ?? 0;
    if (used >= DAILY_CAP) continue;
    counts.set(s.expo_token, used + 1); // count this one toward the cap for siblings in this batch
    out.push(s);
  }
  return out;
}

// ── Dispatch: claim dedup row, send to Expo in batches ───────────────────────
async function dispatch(supabase: SupabaseClient, sends: Send[]): Promise<{ sent: number; errors: number }> {
  if (sends.length === 0) return { sent: 0, errors: 0 };

  // Claim the dedup rows first (unique dedup_key). ignoreDuplicates so a racing
  // concurrent invocation can't double-send; only freshly-claimed rows ship.
  const { data: claimed, error } = await supabase
    .from("notification_log")
    .upsert(
      sends.map((s) => ({
        parent_id: s.parent_id,
        kid_id: s.kid_id,
        expo_token: s.expo_token,
        type: s.type,
        dedup_key: s.dedup_key,
        title: s.title,
        body: s.body,
        data: s.data,
      })),
      { onConflict: "dedup_key", ignoreDuplicates: true },
    )
    .select("dedup_key");
  if (error) {
    console.error("[send-push] log upsert failed", error.message);
    return { sent: 0, errors: sends.length };
  }
  const claimedKeys = new Set((claimed ?? []).map((r: { dedup_key: string }) => r.dedup_key));
  const toSend = sends.filter((s) => claimedKeys.has(s.dedup_key));
  if (toSend.length === 0) return { sent: 0, errors: 0 };

  const messages = toSend.map((s) => ({
    to: s.expo_token,
    title: s.title,
    body: s.body,
    data: s.data,
    sound: "default",
    channelId: "default",
  }));

  let errors = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(batch),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        errors += batch.length;
        console.error("[send-push] expo error", res.status, JSON.stringify(json));
      }
    } catch (e) {
      errors += batch.length;
      console.error("[send-push] expo fetch threw", String(e));
    }
  }
  return { sent: toSend.length, errors };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Authenticate the caller (trigger/cron) via the shared webhook secret.
  const candidate = req.headers.get("x-webhook-secret") ?? "";
  const { data: ok, error: secretErr } = await supabase.rpc("push_webhook_secret_matches", { candidate });
  if (secretErr || ok !== true) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const candidates = await resolveSends(supabase, payload);
    const sends = await applyGuardrails(supabase, candidates);
    const result = await dispatch(supabase, sends);
    return new Response(JSON.stringify({ ok: true, type: payload.type, candidates: candidates.length, ...result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-push] handler threw", String(e));
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
