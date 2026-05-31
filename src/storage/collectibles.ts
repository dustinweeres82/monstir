import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'monstir:collectibles';

export interface CollectibleEntry {
  id: string;         // unique per drop, e.g. uuid or timestamp
  itemKey: string;    // asset key, e.g. 'raregem'
  itemName: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  earnedAt: string;   // ISO timestamp
  weekLabel: string;  // human label, e.g. "May 25 – May 31"
}

export async function saveCollectible(entry: CollectibleEntry): Promise<void> {
  const existing = await getCollectibles();
  existing.unshift(entry);
  await AsyncStorage.setItem(KEY, JSON.stringify(existing));
}

export async function getCollectibles(): Promise<CollectibleEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CollectibleEntry[];
  } catch {
    return [];
  }
}

export async function clearCollectibles(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
