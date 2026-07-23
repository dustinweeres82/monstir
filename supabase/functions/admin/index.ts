// admin — owner-only debug + account-reset API for the Monstir admin dashboard.
//
// The app ships only the anon key, and every table is RLS-scoped to
// parent_id = auth.uid(), so a normal session can only ever see its own
// household. This function is the privileged path: it verifies the caller is
// the admin (by their Supabase JWT email) and then uses the SERVICE ROLE to
// read/modify ANY household. The service-role key never leaves this function.
//
// Mirrors supabase/functions/send-push conventions (esm.sh client, Deno.serve,
// auto-injected SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Browser-facing, so it
// is verify_jwt:false (we verify the JWT ourselves) + CORS-enabled.
//
// Body: { action: string, ...params }. Actions:
//   list_households                         → all households + emails + summary
//   get_household       { parent_id }       → full data bundle for one household
//   soft_reset          { parent_id }       → wipe activity/money/progress, keep
//                                             profile + kids + chores
//   approve_completion  { completion_id, earned_cents? }
//   reject_completion   { completion_id, note? }
//   update_row          { table, id, fields }   (allowlisted tables only)
//   delete_row          { table, id }           (allowlisted tables only)
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.107.0";

// Owner allowlist. Defaults to the project owner; override with the ADMIN_EMAILS
// secret (comma-separated) if you ever add a co-admin.
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") ?? "dustinweeres@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Mirrors App.tsx DIFFICULTY_MULTIPLIERS — used to credit the right amount when
// approving a still-pending completion (earned_cents = base_rate * multiplier).
const DIFFICULTY_MULTIPLIERS: Record<number, number> = { 1: 1.0, 2: 1.5, 3: 2.0 };

// Tables the dashboard may edit/delete rows in. Excludes admin_audit_log and
// anything not safe to touch by raw id. NO hard account delete by design.
const EDITABLE_TABLES = new Set([
  "kids",
  "chores",
  "chore_completions",
  "chore_history",
  "payouts",
  "profiles",
  "savings_goals",
  "boss_captures",
  "collectibles",
  "milestones",
  "battle_state",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Actions ──────────────────────────────────────────────────────────────────

async function listHouseholds(db: SupabaseClient) {
  const [{ data: profiles }, { data: kids }, { data: completions }, usersRes] = await Promise.all([
    db.from("profiles").select("*").order("created_at"),
    db.from("kids").select("id, parent_id, name, coins, xp"),
    db.from("chore_completions").select("parent_id, status, completed_at"),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailById = new Map<string, string>();
  for (const u of usersRes.data?.users ?? []) emailById.set(u.id, u.email ?? "");

  const kidsByParent = new Map<string, { name: string; coins: number }[]>();
  const owedByParent = new Map<string, number>();
  for (const k of kids ?? []) {
    const arr = kidsByParent.get(k.parent_id) ?? [];
    arr.push({ name: k.name, coins: k.coins ?? 0 });
    kidsByParent.set(k.parent_id, arr);
    owedByParent.set(k.parent_id, (owedByParent.get(k.parent_id) ?? 0) + (k.coins ?? 0));
  }

  const pendingByParent = new Map<string, number>();
  const lastActivity = new Map<string, string>();
  for (const c of completions ?? []) {
    if (c.status === "pending") pendingByParent.set(c.parent_id, (pendingByParent.get(c.parent_id) ?? 0) + 1);
    const cur = lastActivity.get(c.parent_id);
    if (c.completed_at && (!cur || c.completed_at > cur)) lastActivity.set(c.parent_id, c.completed_at);
  }

  const households = (profiles ?? []).map((p: Record<string, unknown>) => {
    const pid = p.id as string;
    return {
      parent_id: pid,
      email: emailById.get(pid) ?? "(unknown)",
      name: p.name ?? null,
      parent_role: p.parent_role ?? null,
      base_rate: p.base_rate ?? null,
      created_at: p.created_at ?? null,
      kids: kidsByParent.get(pid) ?? [],
      kid_count: (kidsByParent.get(pid) ?? []).length,
      pending_count: pendingByParent.get(pid) ?? 0,
      coins_owed_cents: owedByParent.get(pid) ?? 0,
      last_activity: lastActivity.get(pid) ?? null,
    };
  });

  return { households };
}

async function getHousehold(db: SupabaseClient, parentId: string) {
  const byParent = (t: string) => db.from(t).select("*").eq("parent_id", parentId);
  const [
    profile,
    kids,
    chores,
    completions,
    history,
    payouts,
    bossCaptures,
    collectibles,
    milestones,
    battleState,
    pushTokens,
    notifications,
    debugLogs,
    usersRes,
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", parentId).maybeSingle(),
    byParent("kids").order("created_at"),
    byParent("chores").order("created_at"),
    byParent("chore_completions").order("completed_at", { ascending: false }),
    byParent("chore_history").order("approved_at", { ascending: false }),
    byParent("payouts").order("paid_at", { ascending: false }),
    byParent("boss_captures").order("captured_at", { ascending: false }),
    byParent("collectibles").order("earned_at", { ascending: false }),
    byParent("milestones").order("earned_at", { ascending: false }),
    byParent("battle_state").order("week_start", { ascending: false }),
    byParent("push_tokens").order("updated_at", { ascending: false }),
    byParent("notification_log").order("sent_at", { ascending: false }).limit(100),
    db.from("debug_logs").select("*").eq("family_id", parentId).order("created_at", { ascending: false }).limit(100),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const email = (usersRes.data?.users ?? []).find((u) => u.id === parentId)?.email ?? "(unknown)";

  return {
    parent_id: parentId,
    email,
    profile: profile.data ?? null,
    kids: kids.data ?? [],
    chores: chores.data ?? [],
    chore_completions: completions.data ?? [],
    chore_history: history.data ?? [],
    payouts: payouts.data ?? [],
    boss_captures: bossCaptures.data ?? [],
    collectibles: collectibles.data ?? [],
    milestones: milestones.data ?? [],
    battle_state: battleState.data ?? [],
    push_tokens: pushTokens.data ?? [],
    notification_log: notifications.data ?? [],
    debug_logs: debugLogs.data ?? [],
  };
}

async function softReset(db: SupabaseClient, parentId: string) {
  const deleted: Record<string, number> = {};
  // Child→parent order. chore_history references chore_completions, so it goes
  // first; the rest are leaf rows hanging off kids/profiles (which we keep).
  const tables = [
    "chore_history",
    "chore_completions",
    "payouts",
    "boss_captures",
    "collectibles",
    "milestones",
    "battle_state",
    "notification_log",
  ];
  for (const t of tables) {
    const { data, error } = await db.from(t).delete().eq("parent_id", parentId).select("id");
    if (error) throw new Error(`delete ${t}: ${error.message}`);
    deleted[t] = data?.length ?? 0;
  }

  // Zero every kid's progress/economy but keep the kid.
  const { error: kidErr } = await db
    .from("kids")
    .update({
      coins: 0,
      xp: 0,
      weekly_xp: 0,
      current_streak: 0,
      shards: 0,
      weekly_shards_claimed: false,
      last_chore_date: null,
      wounded_boss_hp_json: null,
    })
    .eq("parent_id", parentId);
  if (kidErr) throw new Error(`reset kids: ${kidErr.message}`);

  // Clear the parent's cached board/history blobs so the app rebuilds clean from
  // the (now empty) authoritative tables on next load.
  const { error: profErr } = await db
    .from("profiles")
    .update({
      chores_state_json: null,
      chore_history_json: null,
      week_approval_days_json: null,
      last_week_reset: null,
      parent_milestones_json: null,
    })
    .eq("id", parentId);
  if (profErr) throw new Error(`reset profile: ${profErr.message}`);

  return { deleted };
}

async function approveCompletion(db: SupabaseClient, completionId: string, earnedCentsOverride?: number) {
  const { data: c } = await db
    .from("chore_completions")
    .select("id, chore_id, kid_id, parent_id, status, earned_cents")
    .eq("id", completionId)
    .maybeSingle();
  if (!c) throw new Error("completion not found");

  const [{ data: chore }, { data: kid }, { data: profile }] = await Promise.all([
    db.from("chores").select("name, icon, difficulty").eq("id", c.chore_id).maybeSingle(),
    db.from("kids").select("name").eq("id", c.kid_id).maybeSingle(),
    db.from("profiles").select("base_rate").eq("id", c.parent_id).maybeSingle(),
  ]);

  const earnedCents =
    earnedCentsOverride ??
    c.earned_cents ??
    Math.round((profile?.base_rate ?? 50) * (DIFFICULTY_MULTIPLIERS[chore?.difficulty ?? 1] ?? 1));

  // Flip to approved (race-safe: only if still pending), then credit money +
  // history through the same idempotent RPC the app uses so coins/history stay
  // consistent and can't double-credit.
  await db
    .from("chore_completions")
    .update({ status: "approved", approved_at: new Date().toISOString(), earned_cents: earnedCents })
    .eq("id", completionId);

  const { error } = await db.rpc("record_chore_approval", {
    p_completion_id: completionId,
    p_kid_id: c.kid_id,
    p_kid_name: kid?.name ?? "Kid",
    p_chore_name: chore?.name ?? "Chore",
    p_icon: chore?.icon ?? "✅",
    p_earned_cents: earnedCents,
  });
  if (error) throw new Error(`record_chore_approval: ${error.message}`);

  return { completion_id: completionId, earned_cents: earnedCents };
}

async function rejectCompletion(db: SupabaseClient, completionId: string, note?: string) {
  const { data, error } = await db
    .from("chore_completions")
    .update({ status: "rejected", rejection_note: note ?? null })
    .eq("id", completionId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { completion_id: completionId, updated: !!data };
}

async function updateRow(db: SupabaseClient, table: string, id: string, fields: Record<string, unknown>) {
  if (!EDITABLE_TABLES.has(table)) throw new Error(`table not editable: ${table}`);
  if (!id) throw new Error("id required");
  if (!fields || typeof fields !== "object") throw new Error("fields required");
  const { data, error } = await db.from(table).update(fields).eq("id", id).select().maybeSingle();
  if (error) throw new Error(error.message);
  return { row: data };
}

async function deleteRow(db: SupabaseClient, table: string, id: string) {
  if (!EDITABLE_TABLES.has(table)) throw new Error(`table not deletable: ${table}`);
  if (!id) throw new Error("id required");
  const { data, error } = await db.from(table).delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return { deleted: !!data };
}

// Resolve the parent_id a given action targets (for the audit row).
function targetParentId(action: string, params: Record<string, unknown>): string | null {
  if (params.parent_id) return String(params.parent_id);
  return null;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // ── Auth gate: verify the caller's JWT and require the admin email. ──
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "unauthorized", reason: "no_token" }, 401);

  const { data: userData, error: userErr } = await db.auth.getUser(token);
  const email = userData?.user?.email?.toLowerCase() ?? "";
  if (userErr || !email) return json({ error: "unauthorized", reason: "bad_token" }, 401);
  if (!ADMIN_EMAILS.includes(email)) return json({ error: "forbidden", reason: "not_admin" }, 403);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const action = String(body.action ?? "");

  try {
    let result: unknown;
    switch (action) {
      case "list_households":
        result = await listHouseholds(db);
        break;
      case "get_household":
        result = await getHousehold(db, String(body.parent_id));
        break;
      case "soft_reset":
        result = await softReset(db, String(body.parent_id));
        break;
      case "approve_completion":
        result = await approveCompletion(
          db,
          String(body.completion_id),
          body.earned_cents != null ? Number(body.earned_cents) : undefined,
        );
        break;
      case "reject_completion":
        result = await rejectCompletion(db, String(body.completion_id), body.note ? String(body.note) : undefined);
        break;
      case "update_row":
        result = await updateRow(db, String(body.table), String(body.id), body.fields as Record<string, unknown>);
        break;
      case "delete_row":
        result = await deleteRow(db, String(body.table), String(body.id));
        break;
      default:
        return json({ error: "unknown_action", action }, 400);
    }

    // Audit every mutating action (reads stay quiet).
    if (action !== "list_households" && action !== "get_household") {
      await db.from("admin_audit_log").insert({
        actor_email: email,
        action,
        target_parent_id: targetParentId(action, body),
        payload: body,
      });
    }

    return json({ ok: true, action, result });
  } catch (e) {
    console.error("[admin]", action, String(e));
    return json({ error: "action_failed", action, message: String((e as Error).message ?? e) }, 500);
  }
});
