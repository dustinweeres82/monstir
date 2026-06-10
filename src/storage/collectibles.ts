import AsyncStorage from '@react-native-async-storage/async-storage';

// Collectibles (relics) are stored per kid profile — each child has their own.
const keyFor = (kidName: string) => `monstir:collectibles:${kidName}`;

export interface CollectibleEntry {
  id: string;         // unique per drop, e.g. uuid or timestamp
  itemKey: string;    // asset key, e.g. 'raregem'
  itemName: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  earnedAt: string;   // ISO timestamp
  weekLabel: string;  // human label, e.g. "May 25 – May 31"
}

export async function saveCollectible(kidName: string, entry: CollectibleEntry): Promise<void> {
  const existing = await getCollectibles(kidName);
  existing.unshift(entry);
  await AsyncStorage.setItem(keyFor(kidName), JSON.stringify(existing));
}

export async function getCollectibles(kidName: string): Promise<CollectibleEntry[]> {
  const raw = await AsyncStorage.getItem(keyFor(kidName));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CollectibleEntry[];
  } catch {
    return [];
  }
}

export async function clearCollectibles(kidName: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(kidName));
}

/** Merge entries (e.g. hydrated from Supabase) into local storage, deduped by
 *  item + week. Idempotent — safe to call on every login. */
export async function mergeCollectibles(kidName: string, entries: CollectibleEntry[]): Promise<void> {
  const existing = await getCollectibles(kidName);
  const keyOf = (e: CollectibleEntry) => `${e.itemKey}|${e.weekLabel}`;
  const seen = new Set(existing.map(keyOf));
  const merged = [...existing];
  for (const e of entries) {
    if (seen.has(keyOf(e))) continue;
    seen.add(keyOf(e));
    merged.push(e);
  }
  merged.sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
  await AsyncStorage.setItem(keyFor(kidName), JSON.stringify(merged));
}
