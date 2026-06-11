import AsyncStorage from '@react-native-async-storage/async-storage';

// Milestones are stored per owner. Kid milestones use the kid's name; parent
// milestones use the reserved owner key 'parent'. Each profile keeps its own.
export const PARENT_OWNER = 'parent';
const keyFor = (owner: string) => `monstir:milestones:${owner}`;

export interface EarnedMilestone {
  id:       string;
  earnedAt: string;  // ISO
}

// Per-owner write serialization. `earnMilestone`/`mergeMilestones` are async
// read-modify-write: they read the stored list, decide, then write it back. If
// two fire for the same owner before either persists (e.g. paying two kids in
// one tap both award 'parent-first-payout'), both read "not earned" and both
// return `true` — double-firing the toast. Chaining each owner's mutations
// through a promise queue makes the read+write atomic per owner.
const writeChains = new Map<string, Promise<unknown>>();
function withOwnerLock<T>(owner: string, work: () => Promise<T>): Promise<T> {
  const prior = writeChains.get(owner) ?? Promise.resolve();
  // The stored chain is always .catch()'d below, so `prior` never rejects.
  const result = prior.then(() => work());
  writeChains.set(owner, result.catch(() => {}));
  return result;
}

export async function getEarnedMilestones(owner: string): Promise<EarnedMilestone[]> {
  const raw = await AsyncStorage.getItem(keyFor(owner));
  if (!raw) return [];
  try { return JSON.parse(raw) as EarnedMilestone[]; }
  catch { return []; }
}

export async function hasMilestone(owner: string, id: string): Promise<boolean> {
  const earned = await getEarnedMilestones(owner);
  return earned.some(m => m.id === id);
}

export async function earnMilestone(owner: string, id: string): Promise<boolean> {
  return withOwnerLock(owner, async () => {
    const earned = await getEarnedMilestones(owner);
    if (earned.some(m => m.id === id)) return false; // already earned
    earned.unshift({ id, earnedAt: new Date().toISOString() });
    await AsyncStorage.setItem(keyFor(owner), JSON.stringify(earned));
    return true; // newly earned
  });
}

export async function clearMilestones(owner: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(owner));
}

/** Merge entries (e.g. hydrated from Supabase) into local storage, deduped by
 *  milestone id. Idempotent — safe to call on every login. */
export async function mergeMilestones(owner: string, entries: EarnedMilestone[]): Promise<void> {
  return withOwnerLock(owner, async () => {
    const existing = await getEarnedMilestones(owner);
    const seen = new Set(existing.map(m => m.id));
    const merged = [...existing];
    for (const e of entries) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      merged.push(e);
    }
    merged.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
    await AsyncStorage.setItem(keyFor(owner), JSON.stringify(merged));
  });
}
