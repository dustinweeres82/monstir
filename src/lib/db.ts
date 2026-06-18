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
  weekly_cap_enabled?: boolean;
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
  return monday.toISOString().slice(0, 10);
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

export async function submitChoreCompletion(params: {
  choreId: string;
  kidId: string;
  requiresApproval: boolean;
  earnedCents?: number;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const weekStart = getWeekStart();
  const now = new Date().toISOString();
  const status = params.requiresApproval ? 'pending' : 'approved';

  // Server-side completion guards for every recurring chore. The client enforces
  // these too, but a stale or second device can submit against a reopened tile, so
  // the DB is the backstop. (Mirrors the read-then-insert dedup of saveBossCaptureToDb.)
  const { data: chore } = await supabase
    .from('chores')
    .select('frequency')
    .eq('id', params.choreId)
    .maybeSingle();
  const target = weeklyTarget(chore?.frequency);

  // (1) Once per calendar day — a recurring chore can't be completed twice in a
  //     day; it must spread across days (daily, 2×, 3×, … all behave this way).
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { data: sameDay } = await supabase
    .from('chore_completions')
    .select('id')
    .eq('chore_id', params.choreId)
    .eq('kid_id', params.kidId)
    .gte('completed_at', dayStart.toISOString())
    .in('status', ['pending', 'approved'])
    .limit(1);
  if (sameDay && sameDay.length > 0) {
    console.log('[DB] submitChoreCompletion skipped — already completed today');
    return;
  }

  // (2) Weekly cap — never more than the frequency target (2×/3×/…) per week,
  //     counting everything still standing (approved + awaiting approval).
  const { count: weekCount } = await supabase
    .from('chore_completions')
    .select('id', { count: 'exact', head: true })
    .eq('chore_id', params.choreId)
    .eq('kid_id', params.kidId)
    .eq('week_start', weekStart)
    .in('status', ['pending', 'approved']);
  if ((weekCount ?? 0) >= target) {
    console.log(`[DB] submitChoreCompletion skipped — weekly cap reached (${weekCount}/${target})`);
    return;
  }

  const { data, error } = await supabase.from('chore_completions').insert({
    chore_id:     params.choreId,
    kid_id:       params.kidId,
    parent_id:    userId,
    status,
    week_start:   weekStart,
    completed_at: now,
    approved_at:  params.requiresApproval ? null : now,
    earned_cents: params.requiresApproval ? null : params.earnedCents,
  });
  console.log('[DB] submitChoreCompletion data:', data, 'error:', error);
}

export async function approveChoreCompletion(params: {
  choreId: string;
  kidId: string;
  earnedCents: number;
  choreName: string;
  kidName: string;
  icon: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const weekStart = getWeekStart();
  const now = new Date().toISOString();

  // Update chore_completion to approved
  const { data: updateData, error: updateError } = await supabase
    .from('chore_completions')
    .update({ status: 'approved', approved_at: now, earned_cents: params.earnedCents })
    .eq('chore_id', params.choreId)
    .eq('kid_id', params.kidId)
    .eq('week_start', weekStart)
    .eq('status', 'pending');
  console.log('[DB] approveChoreCompletion update data:', updateData, 'error:', updateError);

  // Write to chore_history audit log
  const { data: histData, error: histError } = await supabase.from('chore_history').insert({
    parent_id:    userId,
    kid_id:       params.kidId,
    kid_name:     params.kidName,
    chore_name:   params.choreName,
    icon:         params.icon,
    earned_cents: params.earnedCents,
    approved_at:  now,
  });
  console.log('[DB] approveChoreCompletion history data:', histData, 'error:', histError);
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
}): Promise<void> {
  if (!kidId) return;
  // Use RPC increment to avoid race conditions
  const updates: Record<string, unknown> = {};
  if (delta.xp !== undefined)              updates.xp = delta.xp;
  if (delta.weekly_xp !== undefined)       updates.weekly_xp = delta.weekly_xp;
  if (delta.coins !== undefined)           updates.coins = delta.coins;
  if (delta.current_streak !== undefined)  updates.current_streak = delta.current_streak;
  if (delta.last_chore_date !== undefined) updates.last_chore_date = delta.last_chore_date;
  if (delta.monster_idx !== undefined)     updates.monster_idx = delta.monster_idx;
  if (delta.monster_name !== undefined)    updates.monster_name = delta.monster_name;
  const { data, error } = await supabase.from('kids').update(updates).eq('id', kidId);
  console.log('[DB] updateKidStats data:', data, 'error:', error);
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
