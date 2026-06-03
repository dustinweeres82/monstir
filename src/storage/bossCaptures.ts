import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'monstir:bossCaptures';

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

export async function saveBossCapture(entry: BossCaptureEntry): Promise<void> {
  const existing = await getBossCaptures();
  // Prevent duplicate for same boss captured in same week
  const alreadySaved = existing.some(
    e => e.bossName === entry.bossName && e.weekLabel === entry.weekLabel
  );
  if (alreadySaved) return;
  existing.unshift(entry);
  await AsyncStorage.setItem(KEY, JSON.stringify(existing));
}

export async function getBossCaptures(): Promise<BossCaptureEntry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as BossCaptureEntry[]; }
  catch { return []; }
}

export async function clearBossCaptures(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
