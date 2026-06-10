import AsyncStorage from '@react-native-async-storage/async-storage';

// Boss captures are stored per kid profile — each child has their own trophy room.
const keyFor = (kidName: string) => `monstir:bossCaptures:${kidName}`;

export interface BossCaptureEntry {
  id:            string;    // unique, e.g. `${Date.now()}-${bossName}`
  bossName:      string;
  capturedAt:    string;    // ISO timestamp
  weekLabel:     string;    // e.g. "May 25 – May 31"
  weakness:      string;
  threat:        string;    // 'Easy' | 'Medium' | 'Hard' | 'Extreme'
  completionPct: number;    // chore completion % at battle time
  coinsEarned:   number;
  xpEarned:      number;
}

export async function saveBossCapture(kidName: string, entry: BossCaptureEntry): Promise<void> {
  const existing = await getBossCaptures(kidName);
  // Prevent duplicate for same boss captured in same week
  const alreadySaved = existing.some(
    e => e.bossName === entry.bossName && e.weekLabel === entry.weekLabel
  );
  if (alreadySaved) return;
  existing.unshift(entry);
  await AsyncStorage.setItem(keyFor(kidName), JSON.stringify(existing));
}

export async function getBossCaptures(kidName: string): Promise<BossCaptureEntry[]> {
  const raw = await AsyncStorage.getItem(keyFor(kidName));
  if (!raw) return [];
  try { return JSON.parse(raw) as BossCaptureEntry[]; }
  catch { return []; }
}

export async function clearBossCaptures(kidName: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(kidName));
}

/** Merge entries (e.g. hydrated from Supabase) into local storage, deduped by
 *  boss + week. Idempotent — safe to call on every login. */
export async function mergeBossCaptures(kidName: string, entries: BossCaptureEntry[]): Promise<void> {
  const existing = await getBossCaptures(kidName);
  const keyOf = (e: BossCaptureEntry) => `${e.bossName}|${e.weekLabel}`;
  const seen = new Set(existing.map(keyOf));
  const merged = [...existing];
  for (const e of entries) {
    if (seen.has(keyOf(e))) continue;
    seen.add(keyOf(e));
    merged.push(e);
  }
  merged.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  await AsyncStorage.setItem(keyFor(kidName), JSON.stringify(merged));
}
