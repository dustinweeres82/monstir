import { supabase } from './supabase';
import type { OnboardingChild, ParentSetupResult } from '../screens/ParentOnboarding';

// ─── Get current user ID ───────────────────────────────────────────────────

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ─── Profile ───────────────────────────────────────────────────────────────

export async function saveProfile(fields: {
  name?: string;
  parent_role?: string;
  base_rate?: number;
  require_approval?: boolean;
  battle_coin_bonus_enabled?: boolean;
  battle_coin_bonus_multiplier?: number;
  goals_json?: string;
  parent_pin?: string | null;
  parent_pin_enabled?: boolean;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { data, error } = await supabase.from('profiles').update(fields).eq('id', userId);
  console.log('[DB] saveProfile data:', data, 'error:', error);
}

export async function saveGoals(goals: unknown[]): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { data, error } = await supabase.from('profiles').update({ goals_json: JSON.stringify(goals) }).eq('id', userId);
  console.log('[DB] saveGoals data:', data, 'error:', error);
}

export async function loadGoals(): Promise<unknown[] | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data } = await supabase.from('profiles').select('goals_json').eq('id', userId).single();
  if (!data?.goals_json) return null;
  try { return JSON.parse(data.goals_json); } catch { return null; }
}

export async function saveAppState(fields: { chore_history_json?: string; week_approval_days_json?: string; chores_state_json?: string; kid_approval_settings_json?: string; last_week_reset?: string; parent_milestones_json?: string }): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { data, error } = await supabase.from('profiles').update(fields).eq('id', userId);
  console.log('[DB] saveAppState data:', data, 'error:', error);
}

export async function loadPayoutLog(): Promise<unknown[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase.from('payouts').select('*').eq('parent_id', userId).order('paid_at', { ascending: false }).limit(50);
  return data ?? [];
}

export async function loadProfile() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

/**
 * Updates the parent's email and/or password in Supabase Auth.
 * Pass only the fields you want to change.
 * Returns an error message string if anything failed, or null on success.
 */
export async function saveEmailAndPassword(fields: {
  email?: string;
  password?: string;
}): Promise<string | null> {
  if (!fields.email && !fields.password) return null;
  const updates: { email?: string; password?: string } = {};
  if (fields.email)    updates.email    = fields.email;
  if (fields.password) updates.password = fields.password;
  const { error } = await supabase.auth.updateUser(updates);
  if (error) return error.message;
  return null;
}

/**
 * Saves the parent's display name to both:
 *  - Supabase Auth user_metadata (the source of truth on login)
 *  - The profiles table (for any server-side reads)
 */
export async function saveDisplayName(name: string): Promise<void> {
  // 1. Update auth user_metadata — this is what's read back on every session load
  const { error } = await supabase.auth.updateUser({ data: { name } });
  if (error) console.warn('[DB] saveDisplayName (auth) error:', error.message);
  // 2. Mirror to profiles table for consistency
  await saveProfile({ name });
}

// ─── Kids ──────────────────────────────────────────────────────────────────

export async function addKid(fields: { name: string; avatar_color: string; avatar_idx: number; age_range: string }) {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data, error } = await supabase.from('kids').insert({ ...fields, parent_id: userId }).select().single();
  console.log('[DB] addKid data:', data, 'error:', error);
  if (error) throw error;
  return data;
}

export async function saveKid(child: OnboardingChild & { parent_id: string }) {
  const { data, error } = await supabase
    .from('kids')
    .insert({
      parent_id:   child.parent_id,
      name:        child.name,
      avatar_color: child.avatarColor,
      avatar_idx:  child.avatarIdx,
      age_range:   child.ageRange,
    })
    .select()
    .single();
  console.log('[DB] saveKid data:', data, 'error:', error);
  if (error) throw error;
  return data;
}

export async function loadKids() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase.from('kids').select('*').eq('parent_id', userId).order('created_at');
  return data ?? [];
}

export async function updateKid(kidId: string, fields: Record<string, unknown>) {
  const { data, error } = await supabase.from('kids').update(fields).eq('id', kidId);
  console.log('[DB] updateKid data:', data, 'error:', error);
}

// Renaming a kid changes their display name, but chore_history and payouts are
// keyed by kid_name (used to compute money owed). Re-key those rows so the
// balance doesn't reset to zero after a rename.
export async function renameKidInHistory(oldName: string, newName: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId || oldName === newName) return;
  const { error: histErr } = await supabase.from('chore_history').update({ kid_name: newName }).eq('parent_id', userId).eq('kid_name', oldName);
  const { error: payErr }  = await supabase.from('payouts').update({ kid_name: newName }).eq('parent_id', userId).eq('kid_name', oldName);
  if (histErr || payErr) console.warn('[DB] renameKidInHistory error:', histErr, payErr);
}

// ─── Chores ────────────────────────────────────────────────────────────────

export async function addChore(fields: { name: string; icon: string; frequency: string; difficulty: number; assigned_to: string[]; completion_mode?: string | null }) {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data, error } = await supabase.from('chores').insert({ ...fields, parent_id: userId }).select().single();
  console.log('[DB] addChore data:', data, 'error:', error);
  if (error) throw error;
  return data;
}

export async function saveChore(chore: {
  parent_id: string;
  name: string;
  icon: string;
  frequency: string;
  difficulty: number;
  assigned_to: string[];
}) {
  const { data, error } = await supabase.from('chores').insert(chore).select().single();
  console.log('[DB] saveChore data:', data, 'error:', error);
  if (error) throw error;
  return data;
}

export async function loadChores() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase.from('chores').select('*').eq('parent_id', userId).order('created_at');
  return data ?? [];
}

/**
 * This week's chore completions (pending + approved) — the durable, append-only,
 * server-guarded source for reconstructing per-kid board state. `chore_completions`
 * is the ONE source of truth (its once-per-day + household-scope guards keep it
 * correct where the chores_state_json blob gets clobbered cross-device). On load we
 * rebuild from this instead of trusting the blob:
 *   - APPROVED rows  → childCompletions / weeklyCompletions (the readiness counters)
 *   - PENDING+APPROVED `completed_at` → childLastDoneDate (the once-per-day lock, which
 *     is stamped at SUBMIT, so pending counts toward the lock too)
 * Scoped to the current week_start (out-of-week / debug-scrub buckets are ignored).
 */
export async function loadWeekCompletions(): Promise<{ chore_id: string; kid_id: string; completed_at: string; status: string }[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('chore_completions')
    .select('chore_id, kid_id, completed_at, status')
    .eq('parent_id', userId)
    .eq('week_start', getWeekStart())
    .in('status', ['pending', 'approved']);
  return (data ?? []) as { chore_id: string; kid_id: string; completed_at: string; status: string }[];
}

export type ChoreHistoryRow = { id: string; kid_name: string; chore_name: string; icon: string | null; earned_cents: number; approved_at: string };

/**
 * MON-92 / MON-91: load the parent's chore history from the append-only
 * `chore_history` TABLE — the authoritative audit, written on every approval and
 * auto-approval. This is the source for both the History tab and the money
 * breakdown (earned-this-week / unpaid-weeks / past-due). It REPLACES reading the
 * `chore_history_json` blob, which is saved whole-column last-writer-wins and so
 * drifts/clobbers across devices (ghost completions, phantom owed amounts). The
 * columns map 1:1 onto the in-app choreHistory row shape. Newest first.
 */
export async function loadChoreHistory(): Promise<ChoreHistoryRow[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('chore_history')
    .select('id, kid_name, chore_name, icon, earned_cents, approved_at')
    .eq('parent_id', userId)
    .order('approved_at', { ascending: false });
  return (data ?? []) as ChoreHistoryRow[];
}

export async function updateChore(choreId: string, fields: Record<string, unknown>) {
  const { data, error } = await supabase.from('chores').update(fields).eq('id', choreId);
  console.log('[DB] updateChore data:', data, 'error:', error);
  if (error) throw error;
}

export async function deleteChore(choreId: string) {
  const { data, error } = await supabase.from('chores').delete().eq('id', choreId);
  console.log('[DB] deleteChore data:', data, 'error:', error);
}

// ─── Onboarding: save everything at once ──────────────────────────────────

export async function saveOnboardingSetup(
  setup: ParentSetupResult,
  choreCatalogue: Record<string, { name: string; icon: string; difficulty: string; frequency?: string; completionMode?: 'shared' | 'independent' }>,
): Promise<{ kidIdMap: Record<string, string>; kidCodeMap: Record<string, string>; choreNameToId: Record<string, string> }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not logged in');

  // 1. Update profile with parent role
  const { data: profileData, error: profileError } = await supabase.from('profiles').update({ parent_role: setup.parentRole }).eq('id', userId);
  console.log('[DB] saveOnboardingSetup profile data:', profileData, 'error:', profileError);

  // 2. Insert kids and build name→id / name→standing-pairing-code maps. The
  // pairing_code is assigned by the column default (gen_kid_pairing_code()); we
  // capture it from the returned row so onboarding kids show a code immediately.
  const kidIdMap: Record<string, string> = {};
  const kidCodeMap: Record<string, string> = {};
  for (const child of setup.children) {
    const baseFields: Record<string, unknown> = {
      parent_id:    userId,
      name:         child.name,
      avatar_color: child.avatarColor,
      avatar_idx:   child.avatarIdx,
      age_range:    child.ageRange,
    };
    // Insert the code shown to the parent in onboarding. On the (astronomically
    // unlikely) unique-code collision, retry without it so the DB assigns a fresh
    // unique one — onboarding never fails; the authoritative code comes back below.
    const withCode = child.pairingCode ? { ...baseFields, pairing_code: child.pairingCode } : baseFields;
    let { data, error } = await supabase.from('kids').insert(withCode).select().single();
    if (error && (error as { code?: string }).code === '23505') {
      ({ data, error } = await supabase.from('kids').insert(baseFields).select().single());
    }
    console.log('[DB] saveOnboardingSetup insert kid', child.name, 'data:', data, 'error:', error);
    if (error) throw error;
    kidIdMap[child.name] = data.id;
    if (data.pairing_code) kidCodeMap[child.name] = data.pairing_code;
  }

  // 3. MON-85: one shared chore set for the whole family. Each selected chore is
  // inserted once with assigned_to: [] (everyone), so kids added later inherit it.
  const choreNameToId: Record<string, string> = {};
  for (const choreId of setup.sharedChoreIds) {
    const catalogue = choreCatalogue[choreId];
    const { data, error } = await supabase.from('chores').insert({
      parent_id:       userId,
      name:            catalogue?.name ?? choreId,
      icon:            catalogue?.icon ?? '✅',
      frequency:       catalogue?.frequency ?? 'Every day',
      difficulty:      catalogue?.difficulty === 'Hard' ? 3 : catalogue?.difficulty === 'Medium' ? 2 : 1,
      assigned_to:     [],
      completion_mode: catalogue?.completionMode ?? null,
    }).select('id, name').single();
    console.log('[DB] saveOnboardingSetup insert shared chore', catalogue?.name ?? choreId, 'data:', data, 'error:', error);
    if (data?.id && data?.name) choreNameToId[data.name] = data.id;
  }

  return { kidIdMap, kidCodeMap, choreNameToId };
}

// ─── Chore Completions ─────────────────────────────────────────────────────

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  // Format from LOCAL components, NOT toISOString(): the Monday is computed in
  // local time, but toISOString() converts to UTC, which shifts the date by one
  // for evening submissions in negative-offset zones (9pm CT = 3am UTC next day)
  // — producing an off-by-one week_start that splits the weekly cap and can make
  // approval's week_start match miss the pending row.
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** How many times a chore may be completed per week, by frequency label.
 *  Mirrors frequencyToWeeklyTarget in App.tsx — keep the two in sync. */
function weeklyTarget(frequency: string | null | undefined): number {
  switch (frequency) {
    case 'Every day':
    case 'daily':            return 7;
    case '3 times per week':
    case '3x':               return 3;
    case '2 times per week':
    case '2x':               return 2;
    default:                 return 1; // Once a week / weekly / 1x / As needed / unknown
  }
}

export type SubmitClaimResult = {
  ok: boolean;                    // false only on a transient RPC/network error → caller keeps optimistic, no revert
  claimedId: string | null;      // new completion id when this submit won the slot
  blockedByKid: string | null;   // holder's kid_id when the slot was already taken (self vs sibling lives here)
  blockedByName: string | null;  // holder's display name (for the sibling-credited message)
};

// Submit a chore completion through the atomic-claim RPC (submit_chore_claim). This is
// the ONLY app path that inserts chore_completions, and the only writer of completed_date
// / completion_mode (the partial unique indexes key on them). The RPC enforces
// once-per-day + weekly-cap (shared scoped household-wide, individual per-kid) and is
// race-safe via the unique index: concurrent submits can't double a first-to-finish
// chore, and a stale second device gets a clean "blocked" (with the holder's id) instead
// of a dropped row. The caller decides the kid-facing outcome from the result —
// claimed / self re-tap (settle quietly) / sibling won (settle + "X beat you to it") /
// transient error (keep optimistic) / genuine fail (revert).
export async function submitChoreCompletion(params: {
  choreId: string;
  kidId: string;
  requiresApproval: boolean;
  earnedCents?: number;
}): Promise<SubmitClaimResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, claimedId: null, blockedByKid: null, blockedByName: null };

  // Device-local calendar day + midnight instant — the same "today" boundary the old
  // client guard used (local, not UTC, so an evening submission buckets to the right day).
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const localDate = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase.rpc('submit_chore_claim', {
    p_chore_id: params.choreId,
    p_kid_id: params.kidId,
    p_local_date: localDate,
    p_day_start: dayStart.toISOString(),
    p_requires_approval: params.requiresApproval,
    p_earned_cents: params.earnedCents ?? null,
  });
  if (error) {
    console.warn('[DB] submit_chore_claim error:', error.message);
    return { ok: false, claimedId: null, blockedByKid: null, blockedByName: null };
  }
  const row = Array.isArray(data) ? data[0] : data;
  console.log('[DB] submit_chore_claim:', row);
  return {
    ok: true,
    claimedId: row?.claimed_id ?? null,
    blockedByKid: row?.blocked_by_kid ?? null,
    blockedByName: row?.blocked_by_name ?? null,
  };
}

// Idempotent approval award (MON-92 follow-up). Writes the chore_history feed row
// keyed to its completion and credits the kid's coins EXACTLY ONCE, no matter how
// many devices / retries / realtime echoes call it for the same completion — the
// DB dedups on chore_history.completion_id and only credits coins on first insert.
// This is the single chokepoint that persists chore-approval money + history; the
// client only does an optimistic local coin bump (addKidCoins with persist:false).
export async function recordChoreApproval(params: {
  completionId: string;
  kidId: string;
  kidName: string;
  choreName: string;
  earnedCents: number;
  icon: string;
}): Promise<void> {
  const { error } = await supabase.rpc('record_chore_approval', {
    p_completion_id: params.completionId,
    p_kid_id:        params.kidId,
    p_kid_name:      params.kidName,
    p_chore_name:    params.choreName,
    p_icon:          params.icon,
    p_earned_cents:  params.earnedCents,
  });
  if (error) console.warn('[DB] recordChoreApproval error:', error.message);
}

// MON-94 (Phase 1 of MON-92): approval is now a single race-safe, backlog-aware
// RPC (approve_chore_unit) that makes chore_completions the PRIMARY, guarded write.
// It claims the oldest still-pending unit for (chore, kid) — ANY week, so backlog
// is claimable — FOR UPDATE SKIP LOCKED, so a Sunday batch or a second device each
// flip a DISTINCT row, then writes history + credits coins idempotently keyed to
// that completion. The old path scoped the claim to the CURRENT week_start at a
// fixed unitIdx, which dropped backlog/raced approvals (live: Millie −$1.50).
//
// Returns `awarded`: true when a unit was claimed + paid, false when there was
// NOTHING claimable. Option 2 (claim-or-revert): on false the caller must roll
// back its optimistic credit so coins / history / blob never move without a
// committed chore_completions row.
export async function approveChoreCompletion(params: {
  choreId: string;
  kidId: string;
  earnedCents: number;
  choreName: string;
  kidName: string;
  icon: string;
}): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return true; // not signed in: can't confirm — keep optimistic, guardrail catches drift

  const { data, error } = await supabase.rpc('approve_chore_unit', {
    p_chore_id:     params.choreId,
    p_kid_id:       params.kidId,
    p_kid_name:     params.kidName,
    p_chore_name:   params.choreName,
    p_icon:         params.icon,
    p_earned_cents: params.earnedCents,
  });
  if (error) {
    console.warn('[DB] approveChoreCompletion error:', error.message);
    return true; // ambiguous (network/RPC error): keep optimistic, don't strand a real award
  }
  // null = nothing claimable (caller reverts); a number = cents awarded.
  return data != null;
}

export async function rejectChoreCompletion(params: {
  choreId: string;
  kidId: string;
  rejectionNote?: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const weekStart = getWeekStart();

  const { data, error } = await supabase
    .from('chore_completions')
    .update({ status: 'rejected', rejection_note: params.rejectionNote ?? null })
    .eq('chore_id', params.choreId)
    .eq('kid_id', params.kidId)
    .eq('week_start', weekStart)
    .eq('status', 'pending');
  console.log('[DB] rejectChoreCompletion data:', data, 'error:', error);
}

// ─── Boss Captures ─────────────────────────────────────────────────────────

export async function saveBossCaptureToDb(params: {
  kidId: string;
  bossName: string;
  xpEarned: number;
  coinsEarned: number;
  completionPct?: number;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const weekStart = getWeekStart();

  // Prevent duplicate for same boss/kid/week
  const { data: existing } = await supabase
    .from('boss_captures')
    .select('id')
    .eq('kid_id', params.kidId)
    .eq('boss_name', params.bossName)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (existing) return; // already saved

  const { data, error } = await supabase.from('boss_captures').insert({
    kid_id:         params.kidId,
    parent_id:      userId,
    boss_name:      params.bossName,
    xp_earned:      params.xpEarned,
    coins_earned:   params.coinsEarned,
    completion_pct: params.completionPct ?? null,
    week_start:     weekStart,
    captured_at:    new Date().toISOString(),
  });
  console.log('[DB] saveBossCaptureToDb data:', data, 'error:', error);
}

export async function loadBossCaptures(kidId: string) {
  const { data } = await supabase
    .from('boss_captures')
    .select('*')
    .eq('kid_id', kidId)
    .order('captured_at', { ascending: false });
  return data ?? [];
}

// ─── Per-child weekly boss (MON-84) ──────────────────────────────────────────
// The family shares ONE boss IDENTITY per week (household_boss_week), but each
// kid fights their own single-resolution instance recorded in kid_boss_result.
// Both writes go through dedup-keyed RPCs so two devices on the same parent
// account agree on the boss and a capture pays out EXACTLY once.

export type HouseholdBossWeek = { bossName: string; tier: number };

// Pin (or read back) the week's shared boss identity. The first device to call
// for a given week wins the pick; everyone else reads back the SAME name — so
// the boss a kid fights and the boss the dashboard reveals always agree. Returns
// null only when signed out / the RPC errored (caller falls back to its local
// deterministic pick).
export async function getOrCreateHouseholdBoss(
  weekStart: string,
  bossName: string,
  tier: number,
): Promise<HouseholdBossWeek | null> {
  const { data, error } = await supabase.rpc('get_or_create_household_boss', {
    p_week_start: weekStart,
    p_boss_name:  bossName,
    p_tier:       tier,
  });
  if (error) { console.warn('[DB] getOrCreateHouseholdBoss error:', error.message); return null; }
  const row = (data ?? {}) as { boss_name?: string; tier?: number };
  if (!row.boss_name) return null;
  return { bossName: row.boss_name, tier: row.tier ?? tier };
}

// Record a kid's single-resolution weekly outcome EXACTLY once and credit the
// capture coin bonus only on that first write. Returns { first }: the client
// fires the durable reward writes (chest/relic/trophy/local coin bump) only when
// first === true. A second call for the same (kid, week) — other device, retry,
// double-tap — is a no-op. On RPC error we return first:false so we never
// double-grant; the cost is a rare under-grant on a network blip, which is the
// safe direction for money (mirrors how record_chore_approval owns coin credits).
export async function resolveKidBoss(params: {
  kidId: string;
  weekStart: string;
  bossName: string;
  result: 'captured' | 'got-away';
  completionPct: number;
  coins: number;
}): Promise<{ first: boolean; coinsAwarded: number }> {
  const { data, error } = await supabase.rpc('resolve_kid_boss', {
    p_kid_id:         params.kidId,
    p_week_start:     params.weekStart,
    p_boss_name:      params.bossName,
    p_result:         params.result,
    p_completion_pct: params.completionPct,
    p_coins:          params.coins,
  });
  if (error) {
    console.warn('[DB] resolveKidBoss error:', error.message);
    return { first: false, coinsAwarded: 0 };
  }
  const row = (data ?? {}) as { first?: boolean; coins_awarded?: number };
  return { first: row.first === true, coinsAwarded: row.coins_awarded ?? 0 };
}

export type KidBossResultRow = {
  kid_id: string;
  boss_name: string;
  result: 'captured' | 'got-away';
  completion_pct: number;
  resolved_at: string;
};

// All per-kid outcomes for the household this week — drives the parent dashboard
// reveal and each kid's cross-device "already fought" lock. Keyed by kid_id.
export async function loadKidBossResults(weekStart: string): Promise<KidBossResultRow[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('kid_boss_result')
    .select('kid_id, boss_name, result, completion_pct, resolved_at')
    .eq('parent_id', userId)
    .eq('week_start', weekStart);
  return (data ?? []) as KidBossResultRow[];
}

// ─── Savings goals (normalized; replaces the kids.goals_json blob) ────────────

export type SavingsGoalRow = {
  id: string;
  kid_id: string;
  name: string;
  target_cents: number;
  saved_cents: number;
  category: string | null;
  color: string | null;
  icon: string | null;         // the stable iconKey (the rendered image is derived from it)
  activity_feed: { label: string; pts: number; when: string }[];
};

export async function loadSavingsGoals(): Promise<SavingsGoalRow[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('savings_goals')
    .select('id, kid_id, name, target_cents, saved_cents, category, color, icon, activity_feed')
    .eq('parent_id', userId)
    .order('created_at');
  return (data ?? []) as SavingsGoalRow[];
}

export type SavingsGoalWrite = {
  id: string;                  // uuid
  name: string;
  target_cents: number;
  saved_cents: number;
  category: string;
  color: string;
  icon: string;                // iconKey
  activity_feed: { label: string; pts: number; when: string }[];
};

// Full per-kid sync: upsert the kid's current goals (by id) and delete any DB
// rows for that kid that are no longer present. Keeps savings_goals the single
// source of truth as goals are added / edited / progressed / deleted.
export async function syncKidSavingsGoals(kidId: string, goals: SavingsGoalWrite[]): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId || !kidId) return;

  if (goals.length > 0) {
    const rows = goals.map(g => ({
      id:            g.id,
      kid_id:        kidId,
      parent_id:     userId,
      name:          g.name,
      target_cents:  g.target_cents,
      saved_cents:   g.saved_cents,
      category:      g.category,
      color:         g.color,
      icon:          g.icon,
      activity_feed: g.activity_feed,
    }));
    const { error } = await supabase.from('savings_goals').upsert(rows, { onConflict: 'id' });
    if (error) { console.warn('[DB] syncKidSavingsGoals upsert error:', error.message); return; }
  }

  // Remove goals deleted on this device.
  let del = supabase.from('savings_goals').delete().eq('kid_id', kidId);
  if (goals.length > 0) del = del.not('id', 'in', `(${goals.map(g => g.id).join(',')})`);
  const { error: delErr } = await del;
  if (delErr) console.warn('[DB] syncKidSavingsGoals delete error:', delErr.message);
}

// ─── Collectibles ──────────────────────────────────────────────────────────

export async function saveCollectibleToDb(params: {
  kidId: string;
  collectibleId: string;
  rarity: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { data, error } = await supabase.from('collectibles').insert({
    kid_id:         params.kidId,
    parent_id:      userId,
    collectible_id: params.collectibleId,
    rarity:         params.rarity.toLowerCase(),
    week_start:     getWeekStart(),
    earned_at:      new Date().toISOString(),
  });
  console.log('[DB] saveCollectibleToDb data:', data, 'error:', error);
}

export async function loadCollectibles(kidId: string) {
  const { data } = await supabase
    .from('collectibles')
    .select('*')
    .eq('kid_id', kidId)
    .order('earned_at', { ascending: false });
  return data ?? [];
}

// ─── Payouts ───────────────────────────────────────────────────────────────

export async function savePayoutToDb(params: {
  kidId: string;
  kidName: string;
  amountCents: number;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const { data, error } = await supabase.from('payouts').insert({
    parent_id:    userId,
    kid_id:       params.kidId,
    kid_name:     params.kidName,
    amount_cents: params.amountCents,
    paid_at:      new Date().toISOString(),
  });
  console.log('[DB] savePayoutToDb data:', data, 'error:', error);
}

export async function loadPayouts() {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from('payouts')
    .select('*')
    .eq('parent_id', userId)
    .order('paid_at', { ascending: false });
  return data ?? [];
}

// ─── Milestones ────────────────────────────────────────────────────────────

export async function saveMilestoneToDb(params: {
  kidId: string;
  milestoneId: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  // The unique index on (kid_id, milestone_id) prevents duplicates
  const { data, error } = await supabase.from('milestones').insert({
    kid_id:       params.kidId,
    parent_id:    userId,
    milestone_id: params.milestoneId,
    earned_at:    new Date().toISOString(),
  });

  // Ignore unique constraint violations (already earned)
  if (error && !error.message.includes('unique')) {
    console.log('[DB] saveMilestoneToDb data:', data, 'error:', error);
  } else {
    console.log('[DB] saveMilestoneToDb data:', data, 'error:', error);
  }
}

export async function loadMilestones(kidId: string) {
  const { data } = await supabase
    .from('milestones')
    .select('*')
    .eq('kid_id', kidId)
    .order('earned_at', { ascending: false });
  return data ?? [];
}

// ─── Kid XP / Coins ────────────────────────────────────────────────────────

export async function updateKidStats(kidId: string, delta: {
  xp?: number;
  weekly_xp?: number;
  coins?: number;
  current_streak?: number;
  last_chore_date?: string;
  monster_idx?: number;
  monster_name?: string;
  shards?: number;
  battle_win_streak?: number;
}): Promise<void> {
  if (!kidId) return;
  // Use RPC increment to avoid race conditions
  const updates: Record<string, unknown> = {};
  if (delta.xp !== undefined)                    updates.xp = delta.xp;
  if (delta.weekly_xp !== undefined)             updates.weekly_xp = delta.weekly_xp;
  if (delta.coins !== undefined)                 updates.coins = delta.coins;
  if (delta.current_streak !== undefined)        updates.current_streak = delta.current_streak;
  if (delta.last_chore_date !== undefined)       updates.last_chore_date = delta.last_chore_date;
  if (delta.monster_idx !== undefined)           updates.monster_idx = delta.monster_idx;
  if (delta.monster_name !== undefined)          updates.monster_name = delta.monster_name;
  if (delta.shards !== undefined)                updates.shards = delta.shards;
  if (delta.battle_win_streak !== undefined)     updates.battle_win_streak = delta.battle_win_streak;
  const { data, error } = await supabase.from('kids').update(updates).eq('id', kidId);
  console.log('[DB] updateKidStats data:', data, 'error:', error);
}

// MON-92: atomic coin delta — the race-safe path for the parent-facing "owed"
// balance. Award sites pass a positive delta; payout passes a negative one. Unlike
// updateKidStats' absolute `coins` write (which is last-writer-wins and lost a
// kid's pay when two devices approved at once), concurrent increments compose.
// Caller must pass a resolved UUID (temp local ids are skipped upstream).
export async function incrementKidCoins(kidId: string, delta: number): Promise<void> {
  if (!kidId || delta === 0) return;
  const { error } = await supabase.rpc('increment_kid_coins', { kid: kidId, delta });
  if (error) console.warn('[DB] incrementKidCoins error:', error.message);
}

// ─── Push notifications (MON-29) ─────────────────────────────────────────────

// Upsert this device's Expo push token. Keyed by expo_token (unique), so a
// device re-registering — including after switching which kid it's paired to —
// re-points cleanly. parent_id is always the signed-in household; kid_id marks a
// paired kid device (null = the parent's own device).
export async function upsertPushToken(params: {
  expoToken: string;
  kidId?: string | null;
  platform: string;
  timezone: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { error } = await supabase.from('push_tokens').upsert(
    {
      parent_id:  userId,
      kid_id:     params.kidId ?? null,
      expo_token: params.expoToken,
      platform:   params.platform,
      timezone:   params.timezone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'expo_token' },
  );
  if (error) console.warn('[DB] upsertPushToken error:', error.message);
}

// Resolve a kid's UUID from their display name within the signed-in household.
// Used to tag a paired kid device's push token with the right kid_id.
export async function getKidIdByName(name: string): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from('kids')
    .select('id')
    .eq('parent_id', userId)
    .eq('name', name)
    .maybeSingle();
  return data?.id ?? null;
}

export type NotificationPrefs = { approvals: boolean; battle: boolean; payouts: boolean };

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { approvals: true, battle: true, payouts: true };

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  const userId = await getCurrentUserId();
  if (!userId) return { ...DEFAULT_NOTIFICATION_PREFS };
  const { data } = await supabase.from('profiles').select('notification_prefs').eq('id', userId).single();
  return { ...DEFAULT_NOTIFICATION_PREFS, ...((data?.notification_prefs as Partial<NotificationPrefs>) ?? {}) };
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { error } = await supabase.from('profiles').update({ notification_prefs: prefs }).eq('id', userId);
  if (error) console.warn('[DB] saveNotificationPrefs error:', error.message);
}

// ─── Kid-device pairing (MON-85 Phase 2) ─────────────────────────────────────

// Each kid has a standing 8-digit code (kids.pairing_code, auto-assigned on
// insert). It's reusable — the kid types it on their own device to sign in.
// This rotates it to a fresh unique code (e.g. if it leaks); returns the new code.
export async function rotatePairingCode(kidId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('rotate_kid_pairing_code', { kid: kidId });
  if (error) throw error;
  return (data as string | null) ?? null;
}

// Kid device redeems a code: the edge function validates it (service role) and
// returns a magic-link token_hash for the PARENT account, which we verify to
// assume the parent session on this device ("device acts as the household").
// Returns the kid's name to lock the device into on success.
export async function redeemPairingCode(code: string): Promise<{ kidName: string }> {
  const { data, error } = await supabase.functions.invoke('redeem-pairing-code', { body: { code } });
  if (error) {
    // Surface the function's structured reason when present (e.g. invalid_or_expired).
    let reason = '';
    try { reason = (await (error as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.())?.error ?? ''; } catch {}
    throw new Error(reason || 'redeem_failed');
  }
  const { token_hash, kid_name } = (data ?? {}) as { token_hash?: string; kid_name?: string };
  if (!token_hash || !kid_name) throw new Error('redeem_failed');

  const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash, type: 'magiclink' });
  if (verifyErr) throw new Error('session_failed');

  return { kidName: kid_name };
}
