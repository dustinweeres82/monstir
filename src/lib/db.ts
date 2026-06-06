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
}) {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await supabase.from('profiles').update(fields).eq('id', userId);
}

export async function loadProfile() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

// ─── Kids ──────────────────────────────────────────────────────────────────

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
  await supabase.from('kids').update(fields).eq('id', kidId);
}

// ─── Chores ────────────────────────────────────────────────────────────────

export async function saveChore(chore: {
  parent_id: string;
  name: string;
  icon: string;
  frequency: string;
  difficulty: number;
  assigned_to: string[];
}) {
  const { data, error } = await supabase.from('chores').insert(chore).select().single();
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
  await supabase.from('chores').update(fields).eq('id', choreId);
}

export async function deleteChore(choreId: string) {
  await supabase.from('chores').delete().eq('id', choreId);
}

// ─── Onboarding: save everything at once ──────────────────────────────────

export async function saveOnboardingSetup(
  setup: ParentSetupResult,
  choreCatalogue: Record<string, { name: string; icon: string; difficulty: string }>,
): Promise<{ kidIdMap: Record<string, string> }> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not logged in');

  // 1. Update profile with parent role
  await supabase.from('profiles').update({ parent_role: setup.parentRole }).eq('id', userId);

  // 2. Insert kids and build name→id map
  const kidIdMap: Record<string, string> = {};
  for (const child of setup.children) {
    const { data, error } = await supabase
      .from('kids')
      .insert({
        parent_id:    userId,
        name:         child.name,
        avatar_color: child.avatarColor,
        avatar_idx:   child.avatarIdx,
        age_range:    child.ageRange,
      })
      .select()
      .single();
    if (error) throw error;
    kidIdMap[child.name] = data.id;
  }

  // 3. Group chores by choreId across all kids so shared chores have one row with multiple assigned_to
  const choreKidsMap: Record<string, { name: string; icon: string; difficulty: number; kidIds: string[] }> = {};
  for (const child of setup.children) {
    const kidId = kidIdMap[child.name];
    if (!kidId) continue;
    for (const choreId of child.selectedChoreIds) {
      const catalogue = choreCatalogue[choreId];
      if (!choreKidsMap[choreId]) {
        choreKidsMap[choreId] = {
          name:       catalogue?.name ?? choreId,
          icon:       catalogue?.icon ?? '✅',
          difficulty: catalogue?.difficulty === 'Hard' ? 3 : catalogue?.difficulty === 'Medium' ? 2 : 1,
          kidIds:     [],
        };
      }
      if (!choreKidsMap[choreId].kidIds.includes(kidId)) {
        choreKidsMap[choreId].kidIds.push(kidId);
      }
    }
  }

  for (const [, chore] of Object.entries(choreKidsMap)) {
    await supabase.from('chores').insert({
      parent_id:   userId,
      name:        chore.name,
      icon:        chore.icon,
      frequency:   'daily',
      difficulty:  chore.difficulty,
      assigned_to: chore.kidIds,
    });
  }

  return { kidIdMap };
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

  const { error } = await supabase.from('chore_completions').insert({
    chore_id:     params.choreId,
    kid_id:       params.kidId,
    parent_id:    userId,
    status,
    week_start:   weekStart,
    completed_at: now,
    approved_at:  params.requiresApproval ? null : now,
    earned_cents: params.requiresApproval ? null : params.earnedCents,
  });

  if (error) console.warn('[DB] submitChoreCompletion error:', error.message);
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
  await supabase
    .from('chore_completions')
    .update({ status: 'approved', approved_at: now, earned_cents: params.earnedCents })
    .eq('chore_id', params.choreId)
    .eq('kid_id', params.kidId)
    .eq('week_start', weekStart)
    .eq('status', 'pending');

  // Write to chore_history audit log
  await supabase.from('chore_history').insert({
    parent_id:    userId,
    kid_id:       params.kidId,
    kid_name:     params.kidName,
    chore_name:   params.choreName,
    icon:         params.icon,
    earned_cents: params.earnedCents,
    approved_at:  now,
  });
}

export async function rejectChoreCompletion(params: {
  choreId: string;
  kidId: string;
  rejectionNote?: string;
}): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const weekStart = getWeekStart();

  await supabase
    .from('chore_completions')
    .update({ status: 'rejected', rejection_note: params.rejectionNote ?? null })
    .eq('chore_id', params.choreId)
    .eq('kid_id', params.kidId)
    .eq('week_start', weekStart)
    .eq('status', 'pending');
}

// ─── Boss Captures ─────────────────────────────────────────────────────────

export async function saveBossCaptureToDb(params: {
  kidId: string;
  bossName: string;
  xpEarned: number;
  coinsEarned: number;
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

  const { error } = await supabase.from('boss_captures').insert({
    kid_id:       params.kidId,
    parent_id:    userId,
    boss_name:    params.bossName,
    xp_earned:    params.xpEarned,
    coins_earned: params.coinsEarned,
    week_start:   weekStart,
    captured_at:  new Date().toISOString(),
  });

  if (error) console.warn('[DB] saveBossCaptureToDb error:', error.message);
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

  const { error } = await supabase.from('collectibles').insert({
    kid_id:         params.kidId,
    parent_id:      userId,
    collectible_id: params.collectibleId,
    rarity:         params.rarity.toLowerCase(),
    week_start:     getWeekStart(),
    earned_at:      new Date().toISOString(),
  });

  if (error) console.warn('[DB] saveCollectibleToDb error:', error.message);
}

export async function loadCollectibles(kidId: string) {
  const { data } = await supabase
    .from('collectibles')
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
}): Promise<void> {
  if (!kidId) return;
  // Use RPC increment to avoid race conditions
  const updates: Record<string, unknown> = {};
  if (delta.xp !== undefined)             updates.xp = delta.xp;
  if (delta.weekly_xp !== undefined)      updates.weekly_xp = delta.weekly_xp;
  if (delta.coins !== undefined)          updates.coins = delta.coins;
  if (delta.current_streak !== undefined) updates.current_streak = delta.current_streak;
  if (delta.last_chore_date !== undefined) updates.last_chore_date = delta.last_chore_date;
  await supabase.from('kids').update(updates).eq('id', kidId);
}
