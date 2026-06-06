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
